# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

When adding a new collection, use the `/firebase-collection` Claude Code skill.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

```typescript
_schemaVersion: 1  // increment when doing a breaking schema change
```

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current. See the `/evolve-schema` skill for the full migration workflow.

**Rules:**
- `_schemaVersion` is always `1` on creation
- Non-breaking changes (adding optional fields with defaults) keep the same version
- Breaking changes (rename, remove, type change) increment the version and require a migration function
- Never remove `_schemaVersion` from a schema

---

## `users` collection

**Path:** `/users/{userId}`
**Access:** Owner-only (user can read/write their own document; admins can read all)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Firebase Auth UID (same as document ID) |
| `email` | `string` | Yes | User's email address |
| `displayName` | `string \| null` | Yes | Display name from Auth or profile |
| `photoURL` | `string \| null` | Yes | Profile photo URL |
| `role` | `'user' \| 'admin'` | Yes | User role — immutable by user after creation |
| `createdAt` | `Timestamp` | Yes | When the document was created |
| `updatedAt` | `Timestamp` | Yes | When the document was last updated |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

**Creation:** Auto-created by `AuthProvider` on first sign-in via `syncUserProfile()`.
**Deletion:** Hard-delete is disabled in security rules. Use `deletedAt` field for soft-delete.

---
---

## `personas` collection

**Path:** `/personas/{personaId}`

**Access:** Authenticated users can read persona definitions. Client-side writes are disabled.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Persona identifier; matches the document ID |
| `name` | `string` | Yes | Display name of the persona |
| `level` | `1 \| 2` | Yes | Simulation level the persona belongs to |
| `systemPrompt` | `string` | Yes | System prompt used by the persona API |
| `objections` | `string[]` | Yes | Persona-specific objections/challenges |
| `createdAt` | `Timestamp` | Yes | When the persona was created |
| `updatedAt` | `Timestamp` | Yes | When the persona was last updated |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

**Security:** Persona definitions are read-only from the client. Writes must be performed through trusted server/Admin SDK code.

---

## `sessions` collection

**Path:** `/sessions/{sessionId}`

**Access:** Owner-only. Administrators may read sessions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Session identifier; matches the document ID |
| `uid` | `string` | Yes | Firebase UID of the player who owns the session |
| `personaId` | `string` | Yes | Persona used for this consulting session |
| `level` | `1 \| 2` | Yes | Simulation level |
| `status` | `'active' \| 'completed'` | Yes | Current session state |
| `messages` | `Array` | Yes | Dialogue exchanged between player and persona |
| `createdAt` | `Timestamp` | Yes | When the session started |
| `updatedAt` | `Timestamp` | Yes | When the session was last updated |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

### Session message structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `'player' \| 'persona'` | Yes | Sender of the dialogue message |
| `content` | `string` | Yes | Dialogue text |
| `createdAt` | `Timestamp` | Yes | When the message was created |

**Deletion:** Hard-delete is disabled.

---

## `portfolioProgress` collection

**Path:** `/portfolioProgress/{progressId}`

**Access:** Owner-only. Administrators may read progress.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Progress document identifier |
| `uid` | `string` | Yes | Firebase UID of the player |
| `completedPersonaIds` | `string[]` | Yes | Personas successfully completed |
| `completedLevels` | `number[]` | Yes | Simulation levels successfully completed |
| `totalXp` | `number` | Yes | Player's accumulated XP |
| `createdAt` | `Timestamp` | Yes | When progress tracking began |
| `updatedAt` | `Timestamp` | Yes | When progress was last updated |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

| `skillStats` | `map` | No | Points per skill: `clientDiscovery`, `businessAcumen`, `solutionDesign`, `clientManagement`, `dealSuccess` |
| `stageResults` | `map` | No | Keyed `{stageId}_{clientKey}` (e.g. `5_sarah`) → `{ performance, xp, skillsAwarded, completed, metrics }`. `metrics` holds the level's numeric scores. |
| `badges` | `string[]` | No | One `stage-{n}` badge per stage first completed |

**Document id** is the player's `uid`. The document is written only by the `recordStageCompletion` Server Action (Admin SDK), never directly from the browser.


---

## `meetings` collection

**Path:** `/meetings/{meetingId}` (auto-generated id)

**Access:** Server only (Admin SDK). No client rules, so browsers cannot read or write it.

One document per Level 4 client meeting attempt, written by `POST /api/meeting/score`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Matches the document ID |
| `uid` | `string` | Yes | Firebase UID of the player |
| `personaId` | `string` | Yes | Client persona document id, e.g. `test-level-1` |
| `personaKey` | `string \| null` | Yes | Short client key, e.g. `sarah` |
| `transcript` | `Array<{ role, content }>` | Yes | The full conversation (`role` is `player` or `client`) |
| `prep` | `map \| null` | Yes | The objectives and questions the player prepared in Level 3 |
| `scores` | `map` | Yes | `relationship`, `trust`, `understanding`, `dealPotential`, `patience` (0-100 each) |
| `overall` | `number` | Yes | Average of the five scores |
| `passed` | `boolean` | Yes | `overall` of 50 or more |
| `feedback` | `string` | Yes | Written summary shown to the player |
| `improvements` | `string[]` | Yes | Two improvement tips |
| `createdAt` | `Timestamp` | Yes | When the meeting was assessed |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |


**Deletion:** Hard-delete is disabled.


---

## `contracts` collection

**Path:** `/contracts/{contractId}` (auto-generated id)

**Access:** Server only (Admin SDK). No client rules, so browsers cannot read or write it. Players read their own contracts through `GET /api/closing/contracts`.

One document per Level 6 deal attempt (signed, stalled or lost), written by `POST /api/closing/finalise`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Matches the document ID |
| `uid` | `string` | Yes | Firebase UID of the player |
| `personaKey` | `string` | Yes | Short client key, e.g. `sarah` |
| `terms` | `map` | Yes | `scope`, `investment`, `startDate`, `paymentTerms` (strings) the player put forward |
| `exchanges` | `Array<{ concern, answer }>` | Yes | The client's final concerns and the player's answers |
| `scores` | `map` | Yes | `terms`, `concerns`, `relationship`, `clarity` (0-100 each) |
| `overall` | `number` | Yes | Average of the four scores |
| `outcome` | `string` | Yes | `signed` (overall 60 or more), `stalled` (40 to 59) or `lost` (below 40) |
| `feedback` | `string` | Yes | Written summary shown to the player |
| `improvements` | `string[]` | Yes | Two improvement tips |
| `closingLine` | `string` | Yes | The client's decision in their own voice |
| `createdAt` | `Timestamp` | Yes | When the deal was assessed |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

**Contracts closed** is not stored. It is the number of clients with a completed `6_{clientKey}` entry in `portfolioProgress.stageResults` (only a `signed` outcome completes Level 6).

**Queries:** the player's contracts are read with a single equality filter on `uid`, so no composite index is needed.

**Deletion:** Hard-delete is disabled.
<!-- Add new collection schemas below using the /firebase-collection skill -->
