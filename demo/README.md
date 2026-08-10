# Demo screenshots

Screenshots of Horizon running for real: Postgres, Redis, the API, the built SPA
and Caddy, served over HTTPS at `tweeting.shop`. Every image is a live capture at
2× on a 1280×900 desktop viewport unless the filename says `-mobile` (390×844),
and `-dark` files are the same page with the viewer's theme set to dark.

The accounts, posts and notes in these captures are demo data created at capture
time and removed afterwards. Nothing here ships in the product.

## Current

| Folder | What it shows |
|--------|---------------|
| [`timeline-and-posts/`](timeline-and-posts) | The timeline and a post in full — author badge, affiliation mark and avatar shape on every post, with a Community Note attached inline |
| [`profiles/`](profiles) | One profile per verification tier, plus affiliated accounts, the system account, and the not-found state |
| [`verification-and-affiliation/`](verification-and-affiliation) | An organisation's affiliates list and the admin verification console |
| [`community-notes/`](community-notes) | Every note grouped by whether readers accepted it |
| [`app/`](app) | The rest of the interface: explore, notifications, messages, bookmarks, lists, communities, about, sign-in, register, first-run setup, instance settings |

### Worth looking at first

- `timeline-and-posts/timeline-dark.png` — six accounts across every tier in one
  view: gold, grey and blue badges, affiliate marks, square avatars on
  organisations and on the account raised to business by its affiliation, and a
  note beneath the post it corrects.
- `profiles/affiliated-raised-to-business.png` — an account granted `STANDARD`
  showing the gold badge and a square avatar for as long as its affiliation
  lasts.
- `profiles/government-organisation.png` next to `profiles/government-person.png`
  — the same grey badge, distinguished only by avatar shape.
- `timeline-and-posts/post-detail-with-note.png` — a note in full, with the
  rating prompt readers use to decide whether it stays.

## History

Earlier rounds, kept for reference. These show superseded states — the first set
predates the X restyle and still has the broken logo that was fixed later.

| Folder | What it shows |
|--------|---------------|
| [`history/01-first-deployment/`](history/01-first-deployment) | The first deployment at `tweeting.shop`, before the restyle. The logo is a clipped sliver in every shot — the missing-`viewBox` bug these captures surfaced |
| [`history/02-x-restyle/`](history/02-x-restyle) | The interface after the X restyle, before verification existed |
| [`history/03-verification-rollout/`](history/03-verification-rollout) | Verification tiers and affiliation, including the admin console mid-action |
| [`history/04-community-notes-rollout/`](history/04-community-notes-rollout) | Community Notes and the affiliates view when they first landed |

## Reproducing

Start the stack, seed some accounts and posts through the API, then capture. The
API surface used is documented in [`../docs/verification.md`](../docs/verification.md)
and [`../docs/community-notes.md`](../docs/community-notes.md).
