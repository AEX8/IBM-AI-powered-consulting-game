# Level 6 (Close Deal) API

Backend for the final stage. The player agrees the final contract terms with a client, answers the client's last concerns, and the deal is signed, stalled or lost.

All routes need a logged-in player (session cookie). All are server-side only and use the existing Groq setup, so no new environment variables are needed.

## The flow

1. Player fills in the **contract terms**.
2. `POST /api/closing/concern` with no history returns the client's **first concern** (price and budget).
3. Player answers it.
4. `POST /api/closing/concern` with the first exchange returns the **second concern** (risk and sign-off).
5. Player answers it.
6. `POST /api/closing/finalise` with the terms and both exchanges scores the deal, saves the contract and updates the scorecard.
7. Show the outcome, scores, feedback, tips and the client's closing line.

The routes keep no state between calls. Send the terms and the answered exchanges every time.

## Unlocking

Level 6 is available for a client only after Level 5 is completed with that client. The routes enforce this and return `403` otherwise. The lobby should unlock stage 6 from saved progress the same way it does for the earlier stages. Note that `ConsultingRoom.tsx` currently limits saved-progress unlocking to stage 5 or lower, so that limit needs raising.

Supported clients: `sarah`, `david`.

## Limits (validate in the form)

| Field | Rule |
|-------|------|
| `terms.scope` | 20 to 1,500 characters |
| `terms.investment` | 1 to 100 characters |
| `terms.startDate` | 1 to 60 characters |
| `terms.paymentTerms` | 1 to 500 characters |
| each `answer` | 1 to 400 characters |
| rounds | exactly 2 concerns, each answered before finalising |

## `POST /api/closing/concern`

Asks the client for their next final concern.

Request:

```json
{
  "personaKey": "sarah",
  "terms": {
    "scope": "Phase one connects inventory, orders and logistics data into one dashboard.",
    "investment": "$25,000 AUD fixed price",
    "startDate": "1 March 2027",
    "paymentTerms": "50% on signing, 50% on delivery."
  },
  "history": []
}
```

`history` is the list of `{ "concern": "...", "answer": "..." }` already answered: empty for round 1, one item for round 2. Sending two items is rejected.

Response `200`:

```json
{ "concern": "Is this price really justified for phase one?", "round": 1 }
```

## `POST /api/closing/finalise`

Scores the deal, saves the contract and updates the scorecard.

Request: the same `personaKey` and `terms`, plus `exchanges`, which must hold both answered concerns:

```json
{
  "personaKey": "sarah",
  "terms": { "scope": "...", "investment": "...", "startDate": "...", "paymentTerms": "..." },
  "exchanges": [
    { "concern": "Is this price justified?", "answer": "..." },
    { "concern": "Who signs this off?", "answer": "..." }
  ]
}
```

Response `200`:

```json
{
  "outcome": "signed",
  "completed": true,
  "overall": 80,
  "scores": { "terms": 80, "concerns": 80, "relationship": 80, "clarity": 80 },
  "feedback": "You answered the price concern directly...",
  "improvements": ["Quantify the payback.", "Name the next step."],
  "closingLine": "Good, let us get this signed.",
  "xpAwarded": 1200,
  "skillsAwarded": { "dealSuccess": 2, "clientManagement": 1 }
}
```

## `GET /api/closing/contracts`

The player's own contracts, newest first (up to 50), plus the portfolio count for "contracts closed". Use it for the portfolio and outcome review screens.

Response `200`:

```json
{
  "contracts": [
    {
      "id": "abc123",
      "personaKey": "sarah",
      "outcome": "signed",
      "overall": 80,
      "scores": { "terms": 80, "concerns": 80, "relationship": 80, "clarity": 80 },
      "feedback": "...",
      "improvements": ["...", "..."],
      "closingLine": "...",
      "terms": { "scope": "...", "investment": "...", "startDate": "...", "paymentTerms": "..." },
      "createdAt": 1790000000000
    }
  ],
  "contractsClosed": 1
}
```

`createdAt` is milliseconds since 1970.

## Outcomes and rewards

| Overall score | Outcome | Level 6 complete? | XP |
|---------------|---------|-------------------|----|
| 60 or more | `signed` | Yes | 1,200 if overall is 75 or more, otherwise 840 |
| 40 to 59 | `stalled` | No, retry allowed | 0 |
| Below 40 | `lost` | No, retry allowed | 0 |

A signed deal also awards Deal Success +2 and Client Management +1, once per client. Replaying a finished client keeps the best result, so XP and skills are never double counted.

Score labels for display: `terms` Contract terms, `concerns` Handling final concerns, `relationship` Relationship, `clarity` Clarity and commitment.

## Errors

| Status | Meaning | What to show |
|--------|---------|--------------|
| 400 | Invalid request (message says which field), unknown client, or a round answered out of order | The message, next to the field |
| 401 | Not logged in | Send the player to login |
| 403 | Level 5 not finished with this client | "Finish the proposal with this client first." |
| 500 | The deal was assessed but could not be saved | Offer a retry. Never show the deal as signed |
| 502 | The AI reply could not be read, or the AI service failed | Offer a retry |
| 504 | The AI took too long | Offer a retry |

Error bodies are `{ "error": "message" }`.

## Frontend notes

- AI calls can take up to 25 seconds. Show a loading state and disable the submit button until the call returns, so a player cannot double submit.
- On any error the player must be able to retry without losing what they typed.
- `finalise` writes a record every time it succeeds, including stalled and lost deals, so do not call it twice for one attempt.
- The player can replay a stalled or lost deal, and can replay a signed one.