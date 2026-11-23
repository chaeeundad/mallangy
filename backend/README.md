# Mallangy AR room service

This standalone Cloudflare Worker uses D1. It has no runtime npm dependencies and does not host the frontend. The local SQLite integration test requires a recent Node.js version with `node:sqlite`:

```sh
node --test tests/ar-backend.test.mjs
```

For an authorized deployment only, copy `wrangler.example.jsonc` to a local Wrangler configuration, set the D1 database ID and the exact frontend origin (scheme and hostname, no trailing slash), and apply all pending D1 migrations before deploying the Worker (including `0002_ar_round.sql` for replay). For local testing point `ALLOWED_ORIGIN` at the frontend's actual local origin. Both direct browser calls and a Vercel rewrite work when the configured `Origin` and `X-Mallang-Zone` are passed through. A Cloudflare deployment has not been tested by the SQLite suite.

## API

All POSTs require `Content-Type: application/json`, the exact configured `Origin`, and `X-Mallang-Zone`. Generate at least 128 random bits with Web Crypto and encode them as base64url or hex (22–64 URL-safe characters). The header is the family's bearer secret: anyone with it can join that family's card rooms. Keep it in the client-side URL fragment when sharing, not in URL paths, query strings, service logs, or public screenshots. The Worker validates its format, not the quality of externally supplied randomness.

- `POST /api/markers/:id/enter` (integer 0–249): send `{}` or `{code,token}` to resume. Optional `avatar` saves appearance only; omission keeps an existing seat's appearance, and `null` clears it. Returns `{code,playerId,token,round,players,stars}`.
- `POST /api/rooms/:code/sync`: send `{token,x,z,active,round}` with optional nonnegative integer `jump`, using finite marker-width coordinates in the shared world bounds. Returns `{code,playerId,round,players,stars}`. Stale or future rounds get the current snapshot without updating position, activity, jump, or claims. Missing `round` is treated as zero for clients predating replay.
- `POST /api/rooms/:code/reset`: send `{token,round}` to replay only after every star in that current round is collected (an incomplete current round returns `round_not_complete`, 409). A valid reset advances `round`, clears claims, and restores all seats' spawn positions and jump counters atomically. Duplicate requests carrying the old round get the latest snapshot without resetting again. Use the returned positions and round to restart the client; no new print or room entry is necessary.
- Player records contain `{id,seat,x,z,active,avatar,jump}`. No names, unknown avatar fields, camera images, paint, or stickers are stored. Avatar details include palette indices, shape/face indices and bounded design fields; the frontend decides what to render.
- Star IDs are shared and persistent until the room expires or players replay. Active validated coordinates close to a star trigger its atomic claim. Same family secret plus same printed marker pattern means one room, even on multiple printed copies.
- Rooms expire after two hours. A room has four seats; someone leaving may resume that seat, but its slot stays reserved until expiry. Inactive/stale players disappear from snapshots after their disconnect or 12 seconds. Expired rows are removed opportunistically when someone enters a room.
- Invalid or mismatched resume credentials start a new seat if space exists; an expired or unknown sync seat returns `room_or_player_not_found` (404). No origins or zones are reflected in errors apart from the configured CORS header on allowed origins.
