# Community Notes

Readers write context for a post; other readers rate whether that context helps.
A note appears on the post only once enough of them agree it does.

No ranking model is involved — the rule is a published threshold, so an operator
reading the rating tally can predict the outcome exactly.

## How a note resolves

| Ratings | Share helpful | Status |
|---------|---------------|--------|
| fewer than 3 | — | `NEEDS_MORE_RATINGS` — not shown |
| 3 or more | ≥ ⅔ | `HELPFUL` — shown on the post |
| 3 or more | ≤ ⅓ | `NOT_HELPFUL` — never shown |
| 3 or more | between | `NEEDS_MORE_RATINGS` — still contested |

The thresholds live in `@horizon/shared` as `COMMUNITY_NOTE_MIN_RATINGS`,
`COMMUNITY_NOTE_HELPFUL_RATIO` and `COMMUNITY_NOTE_UNHELPFUL_RATIO`, and the
rule itself is `communityNoteStatus(helpful, notHelpful)`. Change them there and
both API and UI follow.

A contested note stays pending rather than being treated as rejected. Only
helpful notes are attached to the post; everything else is visible at `/notes`,
where each note shows its tally and how many more ratings it needs.

Each rater gets one vote per note and may change it. Re-sending the same verdict
is a no-op, not a second vote.

## Classifications

`MISSING_CONTEXT` (default), `MISLEADING`, `DISPUTED`, `OUTDATED`, `SATIRE`.

## The @CommunityNotes account

Notes are published under `@CommunityNotes`, an account owned by the instance:

- seeded on boot, so it exists on a fresh install with no setup step
- **verified business** automatically, so its notes carry the badge
- **cannot be signed into** — `loginDisabled` is set and it has no credentials
- **cannot be edited, suspended, re-verified or affiliated** — every mutating
  route refuses with `SYSTEM_ACCOUNT_IMMUTABLE` (HTTP 403)

That immutability is the point: a note is only worth reading if the account
carrying it cannot be quietly repurposed, renamed or silenced by whoever runs
the server. Clearing the account directory re-seeds it rather than removing it.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/notes` | All notes, newest first |
| `GET` | `/api/notes?postId=…` | Notes for one post |
| `GET` | `/api/notes?postId=…&visible=true` | Only the notes shown on that post |
| `POST` | `/api/notes` | Write a note (`{ postId, body, classification?, sourceUrl?, author? }`) |
| `GET` | `/api/notes/:id` | One note with its tally |
| `POST` | `/api/notes/:id/ratings` | Rate it (`{ helpful, rater? }`) |

Readers see helpful notes on the post at `/:username/status/:postId`, and the
full picture — including pending and rejected notes — at `/notes`.

**Writing a note and rating one both need a session**, and the author and rater
come from it rather than from the request body. That matters for the threshold:
it assumes distinct raters, and a client-supplied name let one reader clear it
alone. See [`authorization.md`](authorization.md).

Notes are stored in memory for now, like instance settings and the account
directory, and are written to move to Prisma without changing this surface. The
`CommunityNote` and `CommunityNoteRating` models are already in the schema.
