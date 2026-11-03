package testdb

import "testing"

func TestCheckSafe(t *testing.T) {
	cases := map[string]bool{
		"postgres://postgres:pw@localhost:5432/heimdall_test?sslmode=disable": true,
		"postgres://postgres:pw@127.0.0.1:55433/postgres?sslmode=disable":     true,
		"postgres://u:p@ep-x.aws.neon.tech/neondb?sslmode=require":            false,
		"postgres://u:p@db.example.com/heimdall_test":                         true,
		"not a url": false,
	}
	for dsn, ok := range cases {
		if got := checkSafe(dsn) == ""; got != ok {
			t.Errorf("checkSafe(%q) safe=%v, want %v", dsn, got, ok)
		}
	}
}
