package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heimdall-backend/alerts"
	"heimdall-backend/config"
	"heimdall-backend/logger"
	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

type fakePinger struct {
	err   error
	block bool
}

func (f fakePinger) PingContext(ctx context.Context) error {
	if f.block {
		<-ctx.Done()
		return ctx.Err()
	}
	return f.err
}

func getHealth(t *testing.T, h http.Handler, path string) (code int, body map[string]interface{}) {
	t.Helper()
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, http.NoBody)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("bad json: %v", err)
	}
	return rec.Code, body
}

func TestHealth_OK(t *testing.T) {
	code, body := getHealth(t, NewHealthHandler(&config.Config{Version: "9"}, fakePinger{}), "/api/health")
	if code != http.StatusOK || body["status"] != "healthy" || body["version"] != "9" || body["service"] != "heimdall-go-service" {
		t.Errorf("unexpected response %d %v", code, body)
	}
}

func TestHealth_DBDown(t *testing.T) {
	code, body := getHealth(t, NewHealthHandler(&config.Config{}, fakePinger{err: errors.New("boom")}), "/api/health")
	if code != http.StatusServiceUnavailable || body["status"] != "unhealthy" || body["reason"] == "" {
		t.Errorf("unexpected response %d %v", code, body)
	}
}

func TestHealth_PingTimesOut(t *testing.T) {
	start := time.Now()
	code, _ := getHealth(t, NewHealthHandler(&config.Config{}, fakePinger{block: true}), "/api/health")
	if code != http.StatusServiceUnavailable {
		t.Errorf("code = %d, want 503", code)
	}
	if d := time.Since(start); d < 1500*time.Millisecond || d > 4*time.Second {
		t.Errorf("ping took %v, want about 2s", d)
	}
}

func TestHealthLive_IgnoresDB(t *testing.T) {
	code, body := getHealth(t, LiveHandler{}, "/api/health/live")
	if code != http.StatusOK || body["status"] != "alive" {
		t.Errorf("unexpected response %d %v", code, body)
	}
}

func TestWebhook_AlertsOnlyForNewFailures(t *testing.T) {
	hits := make(chan struct{}, 10)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits <- struct{}{}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	n := alerts.New(srv.URL, "", logger.New(false))
	h := NewWebhookHandler(&mockEventStore{}, transformers.NewRegistry(), testSecret).WithNotifier(n)

	send := func(typ, event, delivery string) {
		body, _ := json.Marshal(models.QStashPayload{EventType: typ, Event: json.RawMessage(event), DeliveryID: delivery}) //nolint:errchkjson // test
		if rec := postWebhook(h, body); rec.Code != http.StatusOK {
			t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
		}
		n.Wait()
	}
	count := func() int { return len(hits) }

	failed := `{"type":"deployment.error","payload":{"deployment":{"name":"web"}}}`
	ok := `{"type":"deployment.succeeded","payload":{"deployment":{"name":"web"}}}`

	send("vercel.deploy", ok, "d-ok")
	if count() != 0 {
		t.Fatal("success must not alert")
	}
	send("vercel.deploy", failed, "d-fail")
	if count() != 1 {
		t.Fatalf("expected 1 alert, got %d", count())
	}
	send("vercel.deploy", failed, "d-fail") // duplicate delivery
	if count() != 1 {
		t.Fatalf("duplicate must not alert, got %d", count())
	}
}
