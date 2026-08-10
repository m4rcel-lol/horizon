# Verification & affiliation

Horizon has five verification tiers. Two of them are organisations, and only
organisations can affiliate other accounts.

## Tiers

| Tier | Badge | Avatar | Meaning |
|------|-------|--------|---------|
| `NONE` | — | circle | Not verified |
| `STANDARD` | `verified.svg` (blue) | circle | Verified individual |
| `BUSINESS` | `verified-business.svg` (gold) | **square** | Verified business |
| `GOVERNMENT` | `verified-government.svg` (grey) | circle | A person holding office |
| `GOVERNMENT_BUSINESS` | `verified-government.svg` (grey) | **square** | A government institution |

The two government tiers share one badge and differ only in avatar shape. That
shape is the signal: an institution renders square, a person renders round, so a
ministry and the minister who runs it are distinguishable at a glance without a
second badge colour.

Avatar shape follows **the badge actually displayed**, not the tier the account
was granted. An account raised to a business tier by an affiliation is presented
as an organisation — square avatar — for exactly as long as that affiliation
lasts, and returns to a circular avatar the moment it is removed.

Everything about how a tier presents — badge, avatar shape, label, whether it may
affiliate — comes from `verificationPresentation()` in `@horizon/shared`. Add a
tier there and the API and UI both follow.

## Affiliation

An organisation (`BUSINESS` or `GOVERNMENT_BUSINESS`) can affiliate an account.
The affiliated account then shows a small square mark of the organisation next to
its name, linking back to it.

**Affiliation is itself a verification.** The badge an affiliated account shows
depends on what it already had:

| Tier before | Tier displayed while affiliated |
|-------------|--------------------------------|
| `NONE` | `STANDARD` — affiliation verifies the account |
| `STANDARD` | `BUSINESS` — already verified, so it is raised |
| `BUSINESS` | unchanged |
| `GOVERNMENT`, `GOVERNMENT_BUSINESS` | unchanged — a government tier is not ours to downgrade |

### Derived, never stored

An account stores the tier an administrator granted it (`verification`) and the
organisation that affiliated it (`affiliatedToId`). The badge shown is computed
from the two by `effectiveVerification()`; it is never written back.

That is what makes affiliation reversible. An account that was `STANDARD` on its
own merits and was raised to `BUSINESS` by affiliation returns to `STANDARD` when
the affiliation ends — not to `NONE`, and without anyone tracking which badge
came from where.

### Refusals

`checkAffiliation()` rejects, with a message the UI shows verbatim:

- `SELF_AFFILIATION` — an account cannot affiliate itself
- `NOT_AN_ORGANISATION` — the affiliating account is not a verified business or government organisation
- `ALREADY_AFFILIATED` — an account has at most one organisation; remove the existing affiliation first
- `WOULD_CREATE_CYCLE` — the target already sits above the organisation in the chain, which keeps affiliations a tree

Dropping an organisation below an organisation tier releases everyone it
affiliated, rather than leaving accounts with a badge nothing backs.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/users` | All accounts with their effective badge |
| `POST` | `/api/users` | Create an account |
| `GET` | `/api/users/:username` | One account |
| `PATCH` | `/api/users/:username/verification` | Grant or revoke a tier (`{ type, reason? }`) |
| `GET` | `/api/users/:username/verification/history` | Tier changes over time |
| `GET` | `/api/users/:username/affiliates` | Accounts this organisation has affiliated |
| `POST` | `/api/users/:username/affiliates` | This organisation affiliates `{ username }` |
| `DELETE` | `/api/users/:username/affiliation` | End this account's affiliation |
| `PATCH` | `/api/users/:username` | Edit display name or bio |
| `PATCH` | `/api/users/:username/status` | Suspend or restore (`{ status }`) |

Anyone can see who an organisation has affiliated: its profile links the badge
and the affiliate count to `/<username>/affiliates`, which lists each account
with the badge the affiliation grants it.

Administrators manage all of it at `/admin/verification`.

**Authorization is not enforced yet** — there is no auth module to enforce it
with, so these routes are currently open. The permission keys they will require
already exist in `@horizon/shared`: `verification.grant` and
`verification.revoke` for the tier routes, and organisation ownership for the
affiliation routes. Do not expose this instance publicly until that lands.

The account directory is in-memory for now, like instance settings, and is
written to move to Prisma without changing this surface. The schema is already
in place: `User.verification`, `User.affiliatedToId`, `User.affiliatedAt` and
the `VerificationHistory` model.

## System accounts

Some accounts belong to the instance rather than to a person. They are seeded on
boot, flagged `isSystem`, and every mutation refuses with
`SYSTEM_ACCOUNT_IMMUTABLE` (HTTP 403): they cannot be re-verified, edited,
suspended, affiliated, or used to affiliate anyone else. `loginDisabled` marks
them unusable for sign-in — the auth module must reject them when it lands,
since there is no auth module to reject them today.

`@CommunityNotes` is one: verified as a business so its notes carry the badge,
and immutable so no administrator can quietly repurpose or silence it. See
[Community Notes](community-notes.md).
