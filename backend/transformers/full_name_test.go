package transformers

import (
	"encoding/json"
	"testing"
)

func TestGitHubTransformersStoreFullName(t *testing.T) {
	repo := `"repository": {"name": "r", "full_name": "octo/r", "private": false}`
	inputs := map[string]string{
		"push":    `{"ref":"refs/heads/main",` + repo + `}`,
		"pr":      `{"action":"opened","number":1,"pull_request":{},` + repo + `}`,
		"issue":   `{"action":"opened","issue":{"number":1},` + repo + `}`,
		"release": `{"action":"published","release":{"tag_name":"v1"},` + repo + `}`,
	}
	fns := map[string]func(json.RawMessage) (map[string]interface{}, error){
		"push": func(b json.RawMessage) (map[string]interface{}, error) {
			e, err := TransformGitHubPush(b, testTimestamp)
			return e.Metadata, err
		},
		"pr": func(b json.RawMessage) (map[string]interface{}, error) {
			e, err := TransformGitHubPR(b, testTimestamp)
			return e.Metadata, err
		},
		"issue": func(b json.RawMessage) (map[string]interface{}, error) {
			e, err := TransformGitHubIssue(b, testTimestamp)
			return e.Metadata, err
		},
		"release": func(b json.RawMessage) (map[string]interface{}, error) {
			e, err := TransformGitHubRelease(b, testTimestamp)
			return e.Metadata, err
		},
	}
	for name, in := range inputs {
		t.Run(name, func(t *testing.T) {
			md, err := fns[name](json.RawMessage(in))
			if err != nil {
				t.Fatal(err)
			}
			if md["full_name"] != "octo/r" {
				t.Errorf("full_name = %v, want octo/r", md["full_name"])
			}
			if md["repo"] != "r" {
				t.Errorf("repo = %v, want r", md["repo"])
			}
		})
	}
}
