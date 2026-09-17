# Meeting Prep API Reference

This document describes the backend API endpoints used by Level 3 Meeting Prep.

## Authentication

All Meeting Prep API endpoints require the user to be authenticated with a valid Firebase session cookie.

Unauthenticated requests return:

```json
{
  "error": "Unauthorized"
}
```

---

## GET /api/meeting-prep/clients

Returns the clients available to the authenticated player based on clients previously contacted during earlier levels.

### Request

```http
GET /api/meeting-prep/clients
```

No request body is required.

### Success response

```json
{
  "clients": [
    {
      "id": "test-level1-1",
      "name": "Sarah Chen",
      "jobTitle": "Chief Operating Officer",
      "company": "ACMD Manufacturing",
      "industry": "Manufacturing",
      "coreProblem": "Supply chain delays and poor operational visibility",
      "desiredOutcome": "Better operational visibility without major disruption to existing systems"
    }
  ]
}
```

### Empty state

If the player has no eligible contacted clients:

```json
{
  "clients": []
}
```

---

## GET /api/meeting-prep/clients/[personaId]

Returns the full Client File and Meeting Prep content for a specific persona.

### Request example

```http
GET /api/meeting-prep/clients/test-level1-1
```

### Success response

```json
{
  "client": {
    "personaId": "test-level1-1",
    "name": "Sarah Chen",
    "role": "Chief Operating Officer",
    "company": "ACMD Manufacturing",
    "industry": "Manufacturing",
    "businessChallenge": "ACMD Manufacturing is experiencing supply chain delays and poor operational visibility.",
    "currentSituation": [],
    "businessImpact": [],
    "stakeholders": [],
    "priorities": [],
    "concerns": [],
    "desiredOutcome": [],
    "potentialBusinessValue": [],
    "objectives": [],
    "questions": []
  }
}
```

### Invalid persona ID

```json
{
  "error": "Client file not found"
}
```

Status:

```text
404
```

### Missing persona ID

```json
{
  "error": "Missing personaId"
}
```

Status:

```text
400
```

---

## POST /api/meeting-prep/submissions

Saves a player's selected meeting objectives and prepared questions into Firestore.

Data is stored in the:

```text
meetingPreps
```

collection.

Each document is associated with:

- authenticated user
- session
- persona
- selected objectives
- selected questions

### Request

```http
POST /api/meeting-prep/submissions
Content-Type: application/json
```

### Request body

```json
{
  "sessionId": "test-session-1",
  "personaId": "test-level1-1",
  "selectedObjectives": [
    "Improve supply chain visibility and reduce delivery delays without significantly disrupting existing systems."
  ],
  "selectedQuestions": []
}
```

### Success response

```json
{
  "success": true,
  "id": "USER_ID_test-session-1_test-level1-1"
}
```

### Required fields

The following fields are required:

```text
sessionId
personaId
```

If either is missing:

```json
{
  "error": "sessionId and personaId are required"
}
```

Status:

```text
400
```

---

## Firestore Meeting Prep Schema

Collection:

```text
meetingPreps
```

Document structure:

```text
id: string
uid: string
sessionId: string
personaId: string
selectedObjectives: string[]
selectedQuestions: string[]
createdAt: timestamp
updatedAt: timestamp
_schemaVersion: 1
```

The document ID is generated from:

```text
uid_sessionId_personaId
```

This allows the same player to maintain separate Meeting Prep records across multiple sessions and clients.

---

## Tested Data Flow

The Meeting Prep backend has been tested with multiple sessions.

Example:

```text
test-session-1
test-session-2
```

Both sessions successfully created separate Firestore documents for the same authenticated user and persona.

Validated flow:

```text
Authenticated user
        ↓
Contacted-client query
        ↓
Filtered client list
        ↓
Client File endpoint
        ↓
Player selects objectives/questions
        ↓
Submission endpoint
        ↓
meetingPreps Firestore collection
```

---

## Error Handling

The API currently handles:

- unauthenticated requests
- missing session ID
- missing persona ID
- unknown Client File persona IDs
- empty contacted-client results
- Firestore write failures

Server failures return:

```json
{
  "error": "Failed to save meeting prep submission"
}
```

or:

```json
{
  "error": "Failed to load client file"
}
```

with status:

```text
500
```