package logging

import (
	"log/slog"
	"regexp"
	"testing"
)

// uuidV4Regex matches standard UUIDv4 format.
var uuidV4Regex = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func TestNewCorrelationID_Format(t *testing.T) {
	// Generate multiple IDs and verify each is a valid UUIDv4
	for i := 0; i < 100; i++ {
		id := NewCorrelationID()
		if !uuidV4Regex.MatchString(id) {
			t.Errorf("NewCorrelationID() = %q does not match UUIDv4 format", id)
		}
	}
}

func TestNewCorrelationID_Uniqueness(t *testing.T) {
	// Generate 1000 IDs and ensure no duplicates
	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		id := NewCorrelationID()
		if seen[id] {
			t.Errorf("duplicate correlation ID generated: %s", id)
		}
		seen[id] = true
	}
}

func TestNewCorrelationID_VersionBits(t *testing.T) {
	// Verify version nibble is 4 (UUIDv4)
	id := NewCorrelationID()
	// The 13th character (0-indexed at byte 14 in hex string) should be '4'
	if len(id) < 14 || id[14] != '4' {
		t.Errorf("NewCorrelationID() = %q does not have version 4 at position 14", id)
	}
}

func TestNewCorrelationID_DeterministicAfterNew(t *testing.T) {
	// Each call should produce a different ID (statistically certain)
	a := NewCorrelationID()
	b := NewCorrelationID()
	if a == b {
		t.Error("two sequential IDs should be different")
	}
}

func TestLogAttrs_AllFields(t *testing.T) {
	attrs := LogAttrs("test_component", "job-123", "lecture-456", "corr-789")

	var foundComponent, foundJobID, foundLectureID, foundCorrelationID bool
	for _, attr := range attrs {
		switch attr.Key {
		case "component":
			foundComponent = true
			if attr.Value.String() != "test_component" {
				t.Errorf("expected component 'test_component', got %s", attr.Value.String())
			}
		case "job_id":
			foundJobID = true
			if attr.Value.String() != "job-123" {
				t.Errorf("expected job_id 'job-123', got %s", attr.Value.String())
			}
		case "lecture_id":
			foundLectureID = true
			if attr.Value.String() != "lecture-456" {
				t.Errorf("expected lecture_id 'lecture-456', got %s", attr.Value.String())
			}
		case "correlation_id":
			foundCorrelationID = true
			if attr.Value.String() != "corr-789" {
				t.Errorf("expected correlation_id 'corr-789', got %s", attr.Value.String())
			}
		}
	}

	if !foundComponent {
		t.Error("LogAttrs should include component")
	}
	if !foundJobID {
		t.Error("LogAttrs should include job_id when provided")
	}
	if !foundLectureID {
		t.Error("LogAttrs should include lecture_id when provided")
	}
	if !foundCorrelationID {
		t.Error("LogAttrs should include correlation_id when provided")
	}
}

func TestLogAttrs_EmptyFields(t *testing.T) {
	// Empty values should not be included
	attrs := LogAttrs("test", "", "", "")

	for _, attr := range attrs {
		if attr.Key == "job_id" || attr.Key == "lecture_id" || attr.Key == "correlation_id" {
			t.Errorf("LogAttrs should omit empty field %s", attr.Key)
		}
	}

	// Component should always be present
	var foundComponent bool
	for _, attr := range attrs {
		if attr.Key == "component" {
			foundComponent = true
			break
		}
	}
	if !foundComponent {
		t.Error("LogAttrs should always include component")
	}
}

func TestLogAttrs_ComponentOnly(t *testing.T) {
	attrs := LogAttrs("only_component", "", "", "")

	if len(attrs) != 1 {
		t.Errorf("expected 1 attr (component only), got %d", len(attrs))
	}

	if attrs[0].Key != "component" || attrs[0].Value.String() != "only_component" {
		t.Errorf("expected component 'only_component', got %s=%s", attrs[0].Key, attrs[0].Value.String())
	}
}

func TestSeverityCritical(t *testing.T) {
	attr := SeverityCritical()
	if attr.Key != "critical" {
		t.Errorf("expected key 'critical', got %q", attr.Key)
	}
	if attr.Value.Bool() != true {
		t.Errorf("expected true, got %v", attr.Value.Bool())
	}

	// Verify it works as a slog attribute with DiscardHandler (no panic)
	logger := slog.New(slog.DiscardHandler)
	logger.LogAttrs(nil, slog.LevelWarn, "test critical", SeverityCritical())
}
