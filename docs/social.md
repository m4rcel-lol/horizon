# Following, notifications, bookmarks and search

The social layer: what connects accounts to each other and tells them something
happened. All of it was modelled in the schema and reachable in the interface
long before anything was behind it — the Follow button had no handler, the
notifications page was an empty state, and the search box was an inert input.

## Follows

`Follow` is a two-row relation, not a counter: `Follow(followerId,
followingId)`. Counts are derived, so they cannot drift from the rows.

| Route | Requirement | Notes |
|-------|-------------|-------|
| `PUT /api/users/:username/follow` | signed in | Body `{ on: boolean }` |
| `GET /api/users/:username/relationship` | open | `following`, `followsYou`, `isSelf` |
| `GET /api/users/:username/followers` | open | |
| `GET /api/users/:username/following` | open | |

Sending the state you want rather than toggling, for the same reason likes do:
a retried request cannot land on the opposite of what was asked. Following
yourself is refused.

`GET /api/posts/following` is the chronological feed of accounts you follow. It
includes your own posts — a feed of everyone you follow that silently omits you
reads as though your post failed to send.

## Notifications

Written at the moment the action happens rather than derived by scanning:
reading "what is new for me" has to be one indexed query, and derivation cannot
represent *seen*.

Generated for `LIKE`, `REPLY`, `REPOST`, `QUOTE`, `MENTION` and `FOLLOW`.
Mentions are parsed out of the post body and resolved against real accounts, so
`@nobody` produces nothing.

Two rules keep the list honest:

- **Your own actions are never notifications.** Liking your own post notifies
  nobody.
- **Undoing withdraws.** Un-liking removes the "x liked your post" row rather
  than leaving a claim about something that is no longer true.

Recording one must never break the action that caused it, so a failure is
logged and swallowed — a like that half-succeeded is worse than a missing
notification.

| Route | Requirement |
|-------|-------------|
| `GET /api/notifications` | signed in; `?filter=mentions` narrows it |
| `GET /api/notifications/unread-count` | signed in — one count, for the badge |
| `POST /api/notifications/read` | signed in — marks all read |

Opening the notifications page is what "seen" means, so the badge clears on
arrival rather than needing a button nobody would press.

## Bookmarks

Private to the account; nobody can see what anyone else has saved. The
bookmark icon sits in the post action row, and `bookmarkedByViewer` travels
with every post so it renders filled without a second request.

| Route | Requirement |
|-------|-------------|
| `GET /api/bookmarks` | signed in |
| `PUT /api/bookmarks/:postId` | signed in; body `{ on: boolean }` |

## Search

`GET /api/search?q=` returns accounts and posts together, so the page needs one
request. Matching is plain case-insensitive substring — literally what it says,
with no ranking model deciding what you get to see, which is the same position
the rest of the product takes on feed ranking.

The query lives in the URL (`/explore?q=…`), so a search is a link: shareable,
openable in a new tab, and it survives a refresh.

## Deleting a post

`DELETE /api/posts/:id`. The author may delete their own; an account holding
`posts.delete` may delete anyone's.

Soft delete — the row stays, `deletedAt` is set, and every read filters on it.
Replies and quotes point at their parent by key, and hard-deleting would either
orphan them or cascade away conversations that other people wrote.

`deletableByViewer` travels with each post so the menu only offers what will
actually work.

## Not built

Lists, communities and direct messages are modelled in the schema and have
pages in the interface, but no implementation behind them. Post attachments
(images, polls) are likewise unbuilt — the composer icons are inert. See
[`configuration.md`](configuration.md) for profile media, which is done.
