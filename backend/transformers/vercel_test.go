package transformers

import (
	"encoding/json"
	"testing"
)

func TestTransformVercelDeploy(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		expectedTitle  string
		expectedStatus string
		expectedErr    bool
	}{
		{
			name: "deployment created",
			input: `{
				"type": "deployment.created",
				"payload": {
					"deployment": {
						"id": "dpl_123",
						"name": "heimdall",
						"url": "https://heimdall.vercel.app"
					},
					"target": "production",
					"plan": "pro",
					"regions": ["sfo1"]
				}
			}`,
			expectedTitle:  "Deployment of heimdall",
			expectedStatus: "BUILDING",
			expectedErr:    false,
		},
		{
			name: "deployment succeeded",
			input: `{
				"type": "deployment.succeeded",
				"payload": {
					"deployment": {
						"id": "dpl_456",
						"name": "my-app",
						"url": "https://my-app.vercel.app"
					},
					"target": "preview",
					"plan": "hobby",
					"regions": ["iad1"]
				}
			}`,
			expectedTitle:  "Deployment of my-app",
			expectedStatus: "SUCCESS",
			expectedErr:    false,
		},
		{
			name: "deployment error",
			input: `{
				"type": "deployment.error",
				"payload": {
					"deployment": {
						"id": "dpl_789",
						"name": "broken-app",
						"url": ""
					},
					"target": "production"
				}
			}`,
			expectedTitle:  "Deployment of broken-app",
			expectedStatus: "FAILED",
			expectedErr:    false,
		},
		{
			name: "unknown deployment type",
			input: `{
				"type": "deployment.unknown",
				"payload": {
					"deployment": {
						"id": "dpl_xxx",
						"name": "test",
						"url": ""
					}
				}
			}`,
			expectedTitle:  "Deployment of test",
			expectedStatus: "DEPLOY",
			expectedErr:    false,
		},
		{
			name:        "invalid JSON",
			input:       `not valid json`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformVercelDeploy(json.RawMessage(tt.input))

			if tt.expectedErr {
				if err == nil {
					t.Errorf("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if result.Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Title)
			}

			if result.EventType != "vercel.deploy" {
				t.Errorf("expected event type vercel.deploy, got %q", result.EventType)
			}

			if status, ok := result.Metadata["status"].(string); ok {
				if status != tt.expectedStatus {
					t.Errorf("expected status %q, got %q", tt.expectedStatus, status)
				}
			}
		})
	}
}
