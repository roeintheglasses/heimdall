package transformers

import (
	"encoding/json"
	"testing"
)

func TestTransformRailwayDeploy(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		expectedTitle  string
		expectedStatus string
		expectedErr    bool
	}{
		{
			name: "deploy event with environment",
			input: `{
				"type": "DEPLOY",
				"timestamp": "2024-01-15T10:30:00Z",
				"project": {
					"id": "proj_123",
					"name": "heimdall-backend",
					"description": "Backend service"
				},
				"environment": {
					"id": "env_456",
					"name": "production"
				},
				"deployment": {
					"id": "dep_789",
					"creator": {
						"id": "user_1",
						"name": "John Developer"
					}
				}
			}`,
			expectedTitle:  "Railway deployment of heimdall-backend to production",
			expectedStatus: "SUCCESS",
			expectedErr:    false,
		},
		{
			name: "deploy started",
			input: `{
				"type": "DEPLOY_STARTED",
				"timestamp": "2024-01-15T10:29:00Z",
				"project": {
					"id": "proj_456",
					"name": "api-service"
				},
				"environment": {
					"id": "env_789",
					"name": "staging"
				},
				"deployment": {
					"id": "dep_111",
					"creator": {"id": "user_2", "name": "Jane"}
				}
			}`,
			expectedTitle:  "Railway deployment of api-service to staging",
			expectedStatus: "BUILDING",
			expectedErr:    false,
		},
		{
			name: "deploy failed",
			input: `{
				"type": "DEPLOY_FAILED",
				"timestamp": "2024-01-15T10:35:00Z",
				"project": {
					"id": "proj_789",
					"name": "broken-service"
				},
				"environment": {
					"id": "env_111",
					"name": "production"
				},
				"deployment": {
					"id": "dep_222",
					"creator": {"id": "user_3", "name": "Bob"}
				}
			}`,
			expectedTitle:  "Railway deployment of broken-service to production",
			expectedStatus: "FAILED",
			expectedErr:    false,
		},
		{
			name: "deploy without environment name",
			input: `{
				"type": "DEPLOY",
				"project": {
					"id": "proj_aaa",
					"name": "simple-app"
				},
				"environment": {
					"id": "env_bbb",
					"name": ""
				},
				"deployment": {
					"id": "dep_ccc",
					"creator": {"id": "user_4"}
				}
			}`,
			expectedTitle:  "Railway deployment of simple-app",
			expectedStatus: "SUCCESS",
			expectedErr:    false,
		},
		{
			name:        "invalid JSON",
			input:       `{incomplete`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformRailwayDeploy(json.RawMessage(tt.input))

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

			if result.EventType != "railway.deploy" {
				t.Errorf("expected event type railway.deploy, got %q", result.EventType)
			}

			if status, ok := result.Metadata["status"].(string); ok {
				if status != tt.expectedStatus {
					t.Errorf("expected status %q, got %q", tt.expectedStatus, status)
				}
			}
		})
	}
}
