package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestVisibilityOf(t *testing.T) {
	tests := []struct {
		r    repo
		want string
	}{
		{repo{Visibility: "public"}, "public"},
		{repo{Visibility: "internal", Private: true}, "internal"},
		{repo{Visibility: "private"}, "private"},
		{repo{Private: true}, "private"},
		{repo{}, "public"},
		{repo{Visibility: "weird", Private: true}, "private"},
	}
	for _, tt := range tests {
		if got := visibilityOf(tt.r); got != tt.want {
			t.Errorf("visibilityOf(%+v) = %q, want %q", tt.r, got, tt.want)
		}
	}
}

func TestAmbiguousShortNames(t *testing.T) {
	got := ambiguousShortNames([]repo{{FullName: "a/x"}, {FullName: "b/x"}, {FullName: "a/y"}})
	if !got["x"] || got["y"] {
		t.Errorf("got %v", got)
	}
}

func TestValidFullName(t *testing.T) {
	for s, want := range map[string]bool{"a/b": true, "a": false, "/b": false, "a/": false, "a/b/c": false} {
		if validFullName(s) != want {
			t.Errorf("validFullName(%q) != %v", s, want)
		}
	}
}

func TestFetchReposPaginatesAndSendsToken(t *testing.T) {
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			http.Error(w, "no", http.StatusUnauthorized)
			return
		}
		if r.URL.Query().Get("page") == "2" {
			_, _ = w.Write([]byte(`[{"full_name":"o/b","name":"b","private":true}]`))
			return
		}
		w.Header().Set("Link", `<`+srv.URL+`/user/repos?affiliation=owner&per_page=100&page=2>; rel="next"`)
		_, _ = w.Write([]byte(`[{"full_name":"o/a","name":"a","visibility":"public"}]`))
	}))
	defer srv.Close()

	repos, err := fetchRepos(context.Background(), srv.URL, "tok")
	if err != nil {
		t.Fatal(err)
	}
	if len(repos) != 2 || repos[0].FullName != "o/a" || repos[1].FullName != "o/b" {
		t.Errorf("unexpected repos %+v", repos)
	}
}

func TestFetchReposRejectsForeignNextLink(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Link", `<https://evil.example/x>; rel="next"`)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer srv.Close()
	_, err := fetchRepos(context.Background(), srv.URL, "tok")
	if err == nil || strings.Contains(err.Error(), "tok") {
		t.Errorf("expected pagination error without the token, got %v", err)
	}
}
