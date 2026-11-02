package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"heimdall-backend/transformers"
)

func TestWebhookHandler_NoSecretConfigured503(t *testing.T) {
	repo := &mockEventStore{}
	h := NewWebhookHandler(repo, transformers.NewRegistry(), "")

	rec := postWebhook(h, pushPayload(time.Now().Unix(), validPushEvent))

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
	if repo.insertCalls != 0 {
		t.Errorf("expected no insert, got %d", repo.insertCalls)
	}
}

func TestWebhookHandler_Auth(t *testing.T) {
	tests := []struct {
		name   string
		header string
		set    bool
	}{
		{"missing header", "", false},
		{"wrong secret", "nope", true},
		{"empty secret", "", true},
		{"prefix of secret", testSecret[:3], true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockEventStore{}
			h := newWebhookHandler(repo)
			req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook",
				bytes.NewReader(pushPayload(time.Now().Unix(), validPushEvent)))
			if tt.set {
				req.Header.Set("X-Heimdall-Secret", tt.header)
			}
			rec := httptest.NewRecorder()

			h.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d", rec.Code)
			}
			if repo.insertCalls != 0 {
				t.Errorf("expected no insert, got %d", repo.insertCalls)
			}
		})
	}
}

func TestWebhookHandler_BodyTooLarge413(t *testing.T) {
	repo := &mockEventStore{}
	h := newWebhookHandler(repo)
	big := `{"type":"github.push","timestamp":1,"event":{"pad":"` + strings.Repeat("a", maxWebhookBody) + `"}}`

	rec := postWebhook(h, []byte(big))

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", rec.Code)
	}
	if repo.insertCalls != 0 {
		t.Errorf("expected no insert")
	}
}

func TestWebhookHandler_EventMustBeObject(t *testing.T) {
	tests := map[string]string{
		"missing": `{"type":"github.push","timestamp":0}`,
		"null":    `{"type":"github.push","timestamp":0,"event":null}`,
		"array":   `{"type":"github.push","timestamp":0,"event":[]}`,
		"string":  `{"type":"github.push","timestamp":0,"event":"x"}`,
		"number":  `{"type":"github.push","timestamp":0,"event":5}`,
	}
	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			repo := &mockEventStore{}
			rec := postWebhook(newWebhookHandler(repo), []byte(body))
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d", rec.Code)
			}
			if repo.insertCalls != 0 {
				t.Errorf("expected no insert")
			}
		})
	}
}

func TestWebhookHandler_TimestampWindow(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name string
		ts   int64
		want int
	}{
		{"too old", now.Add(-8 * 24 * time.Hour).Unix(), http.StatusBadRequest},
		{"too far in future", now.Add(10 * time.Minute).Unix(), http.StatusBadRequest},
		{"negative", -5, http.StatusBadRequest},
		{"ms far in the past", now.Add(-30 * 24 * time.Hour).UnixMilli(), http.StatusBadRequest},
		{"just inside", now.Add(-6 * 24 * time.Hour).Unix(), http.StatusOK},
		{"slightly future", now.Add(time.Minute).Unix(), http.StatusOK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockEventStore{}
			rec := postWebhook(newWebhookHandler(repo), pushPayload(tt.ts, validPushEvent))
			if rec.Code != tt.want {
				t.Fatalf("expected %d, got %d (%s)", tt.want, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestWebhookHandler_MillisecondTimestampNormalised(t *testing.T) {
	repo := &mockEventStore{}
	want := time.Now().UTC().Add(-time.Hour).Truncate(time.Second)

	rec := postWebhook(newWebhookHandler(repo), pushPayload(want.UnixMilli(), validPushEvent))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if got := repo.events[0].CreatedAt; !got.Equal(want) {
		t.Errorf("expected %v, got %v", want, got)
	}
}

func TestWebhookHandler_MalformedTransformerInput400(t *testing.T) {
	repo := &mockEventStore{}
	rec := postWebhook(newWebhookHandler(repo), pushPayload(0, `{"repository": 5, "commits": "x"}`))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if repo.insertCalls != 0 {
		t.Errorf("expected no insert")
	}
}

func TestWebhookHandler_DuplicateDelivery(t *testing.T) {
	repo := &mockEventStore{}
	h := newWebhookHandler(repo)
	body := []byte(`{"type":"github.push","timestamp":0,"delivery_id":"github:abc","event":` + validPushEvent + `}`)

	first := postWebhook(h, body)
	second := postWebhook(h, body)

	if first.Code != http.StatusOK || second.Code != http.StatusOK {
		t.Fatalf("expected 200/200, got %d/%d", first.Code, second.Code)
	}
	var f, s map[string]string
	if err := json.Unmarshal(first.Body.Bytes(), &f); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(second.Body.Bytes(), &s); err != nil {
		t.Fatal(err)
	}
	if f["status"] != "ok" || f["id"] == "" {
		t.Errorf("unexpected first response %v", f)
	}
	if s["status"] != "duplicate" {
		t.Errorf("unexpected second response %v", s)
	}
	if len(repo.events) != 1 {
		t.Errorf("expected 1 stored event, got %d", len(repo.events))
	}
	if repo.events[0].DeliveryID != "github:abc" {
		t.Errorf("delivery id not passed to store: %q", repo.events[0].DeliveryID)
	}
}

func TestWebhookHandler_DeliveryIDTooLong(t *testing.T) {
	repo := &mockEventStore{}
	body := []byte(`{"type":"github.push","timestamp":0,"delivery_id":"` + strings.Repeat("x", 256) + `","event":` + validPushEvent + `}`)

	rec := postWebhook(newWebhookHandler(repo), body)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	if repo.insertCalls != 0 {
		t.Errorf("expected no insert")
	}
}
