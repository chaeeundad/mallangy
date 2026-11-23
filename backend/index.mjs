import { COLLECT_RADIUS, STARS, WORLD_LIMIT } from "./world.mjs";
import { normalizeAvatar } from "./avatar.mjs";

const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const TTL = 2 * 60 * 60 * 1000;
const STALE = 12_000;
const MARKER_ROUTE = /^\/api\/markers\/(0|[1-9][0-9]{0,2})\/enter\/?$/i;
const SYNC_ROUTE = /^\/api\/rooms\/([23456789A-HJ-NP-Z]{6})\/sync\/?$/i;
const CODE_PATTERN = /^[23456789A-HJ-NP-Z]{6}$/i;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const ZONE_PATTERN = /^[a-zA-Z0-9_-]{22,64}$/;
const encoder = new TextEncoder();

const newCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (b) => CODE_CHARS[b & 31],
  ).join("");
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (bytes) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
async function hash(value) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}
const stmt = (db, sql, ...params) => db.prepare(sql).bind(...params);
const zoneRoom =
  "SELECT code FROM ar_rooms WHERE zone_hash = ? AND marker_id = ? AND expires_at > ?";

function snapshot(code, id, players, stars) {
  return {
    code,
    playerId: id,
    players: players.results.map(({ avatar, ...p }) => ({
      ...p,
      active: p.active === 1,
      avatar: avatar ? JSON.parse(avatar) : null,
    })),
    stars: stars.results.map((s) => s.star_id),
  };
}

async function enter(db, zone, marker, body, now, respond) {
  const priorCode =
    typeof body.code === "string" && CODE_PATTERN.test(body.code)
      ? body.code.toUpperCase()
      : "";
  const priorToken =
    typeof body.token === "string" && TOKEN_PATTERN.test(body.token)
      ? body.token
      : "";
  const priorHash =
    priorCode && priorToken ? await hash("seat:" + priorToken) : "";
  const newId = randomHex(8);
  const newToken = randomHex(24);
  const newHash = await hash("seat:" + newToken);
  const hasAvatar = Object.hasOwn(body, "avatar");
  const avatar = normalizeAvatar(body.avatar);
  const avatarJson = avatar ? JSON.stringify(avatar) : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const [, , , , member, players, stars, room] = await db.batch([
      stmt(
        db,
        "DELETE FROM ar_rooms WHERE zone_hash = ? AND marker_id = ? AND expires_at <= ?",
        zone,
        marker,
        now,
      ),
      stmt(
        db,
        "INSERT OR IGNORE INTO ar_rooms (code, zone_hash, marker_id, expires_at) VALUES (?, ?, ?, ?)",
        code,
        zone,
        marker,
        now + TTL,
      ),
      stmt(
        db,
        `UPDATE ar_players SET active = 1, seen_at = ?, avatar = CASE WHEN ? THEN ? ELSE avatar END
        WHERE room_code = ? AND token_hash = ? AND room_code = (${zoneRoom})`,
        now,
        hasAvatar ? 1 : 0,
        avatarJson,
        priorCode,
        priorHash,
        zone,
        marker,
        now,
      ),
      stmt(
        db,
        `INSERT OR IGNORE INTO ar_players (room_code, id, token_hash, seat, x, z, active, seen_at, avatar)
        SELECT r.code, ?, ?, counts.seats, -0.75 + counts.seats * 0.5, 0, 1, ?, ?
        FROM ar_rooms r CROSS JOIN (
          SELECT COUNT(*) AS seats FROM ar_players WHERE room_code = (${zoneRoom})
        ) counts
        WHERE r.zone_hash = ? AND r.marker_id = ? AND r.expires_at > ? AND counts.seats < 4
        AND NOT EXISTS (SELECT 1 FROM ar_players p WHERE p.room_code = r.code AND p.room_code = ? AND p.token_hash = ?)`,
        newId,
        newHash,
        now,
        avatarJson,
        zone,
        marker,
        now,
        zone,
        marker,
        now,
        priorCode,
        priorHash,
      ),
      stmt(
        db,
        `SELECT p.id, p.room_code AS code FROM ar_players p WHERE p.room_code = (${zoneRoom})
        AND ((p.room_code = ? AND p.token_hash = ?) OR p.token_hash = ?)`,
        zone,
        marker,
        now,
        priorCode,
        priorHash,
        newHash,
      ),
      stmt(
        db,
        `SELECT id, seat, x, z, active, avatar, jump FROM ar_players WHERE room_code = (${zoneRoom})
        AND active = 1 AND seen_at >= ? ORDER BY seat`,
        zone,
        marker,
        now,
        now - STALE,
      ),
      stmt(
        db,
        `SELECT star_id FROM ar_claims WHERE room_code = (${zoneRoom}) ORDER BY star_id`,
        zone,
        marker,
        now,
      ),
      stmt(db, zoneRoom, zone, marker, now),
      stmt(
        db,
        `DELETE FROM ar_rooms WHERE code IN (SELECT code FROM ar_rooms
        WHERE expires_at <= ? ORDER BY expires_at LIMIT 20)`,
        now,
      ),
    ]);
    if (!room.results.length) continue; // retry only a random room-code collision
    if (!member.results.length) return respond({ error: "room_full" }, 409);
    const joined = member.results[0];
    return respond({
      ...snapshot(joined.code, joined.id, players, stars),
      token: joined.id === newId ? newToken : priorToken,
    });
  }
  return respond({ error: "could_not_create_room" }, 503);
}

async function sync(
  db,
  zone,
  code,
  { token, x, z, active, jump },
  now,
  respond,
) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token))
    return respond({ error: "invalid_token" }, 401);
  if (
    typeof active !== "boolean" ||
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > WORLD_LIMIT ||
    Math.abs(z) > WORLD_LIMIT
  )
    return respond({ error: "invalid_pose" }, 400);
  if (jump !== undefined && (!Number.isSafeInteger(jump) || jump < 0))
    return respond({ error: "invalid_jump" }, 400);
  const tokenHash = await hash("seat:" + token);
  const auth = `FROM ar_players p JOIN ar_rooms r ON r.code = p.room_code
    WHERE p.room_code = ? AND p.token_hash = ? AND r.zone_hash = ? AND r.expires_at > ?`;
  const authArgs = [code, tokenHash, zone, now];
  const claims = active
    ? STARS.filter((s) => Math.hypot(s.x - x, s.z - z) <= COLLECT_RADIUS)
    : [];
  const results = await db.batch([
    stmt(db, `SELECT p.id ${auth}`, ...authArgs),
    stmt(
      db,
      `UPDATE ar_players SET x = ?, z = ?, active = ?, seen_at = ?, jump = COALESCE(?, jump)
      WHERE room_code = ? AND token_hash = ? AND EXISTS (
        SELECT 1 FROM ar_rooms WHERE code = ? AND zone_hash = ? AND expires_at > ?)`,
      x,
      z,
      active ? 1 : 0,
      now,
      jump ?? null,
      code,
      tokenHash,
      code,
      zone,
      now,
    ),
    ...claims.map((s) =>
      stmt(
        db,
        `INSERT OR IGNORE INTO ar_claims (room_code, star_id)
      SELECT ?, ? WHERE EXISTS (SELECT 1 ${auth})`,
        code,
        s.id,
        ...authArgs,
      ),
    ),
    stmt(
      db,
      `SELECT id, seat, x, z, active, avatar, jump FROM ar_players
      WHERE room_code = ? AND active = 1 AND seen_at >= ? AND EXISTS (SELECT 1 ${auth})
      ORDER BY seat`,
      code,
      now - STALE,
      ...authArgs,
    ),
    stmt(
      db,
      `SELECT star_id FROM ar_claims WHERE room_code = ?
      AND EXISTS (SELECT 1 ${auth}) ORDER BY star_id`,
      code,
      ...authArgs,
    ),
  ]);
  const member = results[0].results[0];
  if (!member) return respond({ error: "room_or_player_not_found" }, 404);
  return respond(snapshot(code, member.id, results.at(-2), results.at(-1)));
}

async function readBody(request) {
  const type = request.headers
    .get("Content-Type")
    ?.toLowerCase()
    .split(";")[0]
    .trim();
  if (type !== "application/json" || !request.body)
    return { error: "invalid_json", status: 400 };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0,
    content = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel().catch(() => {});
        return { error: "request_too_large", status: 413 };
      }
      content += decoder.decode(value, { stream: true });
    }
    const value = JSON.parse(content + decoder.decode());
    return value && typeof value === "object" && !Array.isArray(value)
      ? { value }
      : { error: "invalid_json", status: 400 };
  } catch {
    return { error: "invalid_json", status: 400 };
  }
}

export async function handleAR(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = Boolean(
    env.ALLOWED_ORIGIN && origin && origin === env.ALLOWED_ORIGIN,
  );
  const headers = { "Cache-Control": "no-store", Vary: "Origin" };
  if (allowed) headers["Access-Control-Allow-Origin"] = origin;
  const respond = (body, status = 200) =>
    Response.json(body, { status, headers });
  const path = new URL(request.url).pathname;
  const marker = MARKER_ROUTE.exec(path);
  const room = SYNC_ROUTE.exec(path);
  if ((!marker || Number(marker[1]) > 249) && !room)
    return respond({ error: "not_found" }, 404);
  if (!allowed) return respond({ error: "origin_not_allowed" }, 403);
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Mallang-Zone",
        "Access-Control-Max-Age": "600",
      },
    });
  if (request.method !== "POST")
    return Response.json(
      { error: "method_not_allowed" },
      { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } },
    );
  if (!env.DB) return respond({ error: "room_service_unavailable" }, 503);
  const key = request.headers.get("X-Mallang-Zone");
  if (!key || !ZONE_PATTERN.test(key))
    return respond({ error: "invalid_zone" }, 401);
  const body = await readBody(request);
  if (body.error) return respond({ error: body.error }, body.status);
  try {
    const zone = await hash("family:" + key);
    const now = Date.now();
    if (marker)
      return await enter(
        env.DB,
        zone,
        Number(marker[1]),
        body.value,
        now,
        respond,
      );
    return await sync(
      env.DB,
      zone,
      room[1].toUpperCase(),
      body.value,
      now,
      respond,
    );
  } catch {
    // Never log raw request data, family keys or tokens.
    console.error("Mallangy AR database operation failed");
    return respond({ error: "room_service_unavailable" }, 503);
  }
}

export default { fetch: handleAR };
