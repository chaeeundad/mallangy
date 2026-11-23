import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { handleAR } from "../backend/index.mjs";
import { STARS, WORLD_LIMIT } from "../backend/world.mjs";

const ORIGIN = "https://mallang.example";
const WORKER = "https://ar-worker.example";
const HEX_ZONE = "aceF3457cfe26b4029dcb6aF4db2819C";
const URL_ZONE = "JbWAO69K_42fVQptLs-NMg";

function fixture(t) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  sql.exec("PRAGMA foreign_keys = ON");
  sql.exec(
    readFileSync(
      new URL("../backend/migrations/0001_ar.sql", import.meta.url),
      "utf8",
    ),
  );
  const env = {
    ALLOWED_ORIGIN: ORIGIN,
    DB: {
      prepare(query) {
        const stmt = sql.prepare(query);
        return {
          bind(...args) {
            return () =>
              /^SELECT\b/i.test(query)
                ? { results: stmt.all(...args), meta: { changes: 0 } }
                : { results: [], meta: stmt.run(...args) };
          },
        };
      },
      async batch(list) {
        sql.exec("BEGIN IMMEDIATE");
        try {
          const outputs = list.map((run) => run());
          sql.exec("COMMIT");
          return outputs;
        } catch (err) {
          sql.exec("ROLLBACK");
          throw err;
        }
      },
    },
  };
  async function call(path, body = {}, opts = {}) {
    const method = opts.method ?? "POST";
    const origin = opts.origin === undefined ? ORIGIN : opts.origin;
    const zone = opts.zone === undefined ? HEX_ZONE : opts.zone;
    const headers = {
      ...(origin ? { Origin: origin } : {}),
      ...(zone ? { "X-Mallang-Zone": zone } : {}),
      "Content-Type": "application/json; charset=utf-8",
    };
    const r = await handleAR(
      new Request(WORKER + path, {
        method,
        headers,
        body: method === "POST" ? JSON.stringify(body) : undefined,
      }),
      opts.env ?? env,
    );
    return {
      status: r.status,
      headers: r.headers,
      body: r.status === 204 ? null : await r.json(),
    };
  }
  return { call, sql };
}

test("same family and marker share room and claims across independent seats; foreign zones cannot use a stolen seat", async (t) => {
  const { call, sql } = fixture(t);
  const path = "/api/markers/42/enter";
  const joined = await Promise.all([
    call(path),
    call(path),
    call(path, {}, { zone: URL_ZONE }),
    call("/api/markers/43/enter"),
  ]);
  assert.deepEqual(
    joined.map((r) => r.status),
    [200, 200, 200, 200],
  );
  const [a, b, c, d] = joined.map((r) => r.body);
  assert.equal(a.code, b.code);
  assert.notEqual(a.playerId, b.playerId);
  assert.notEqual(a.token, b.token);
  assert.notEqual(c.code, a.code);
  assert.notEqual(d.code, a.code);
  assert.equal(c.players.length, 1);
  const first = STARS[0],
    sync = `/api/rooms/${a.code}/sync`;
  const poses = { x: first.x, z: first.z, active: true };
  const [one, two] = await Promise.all([
    call(sync, { token: a.token, ...poses }),
    call(sync, { token: b.token, ...poses }),
  ]);
  assert.deepEqual([one.status, two.status], [200, 200]);
  assert.deepEqual(two.body.stars, [first.id]);
  assert.deepEqual(one.body.stars, [first.id]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM ar_claims").get().n, 1);
  assert.equal(
    (await call(sync, { token: a.token, ...poses }, { zone: URL_ZONE })).status,
    404,
  );
  assert.equal(
    (await call(sync, { token: a.token, ...poses, x: WORLD_LIMIT + 0.01 }))
      .status,
    400,
  );
  assert.equal(
    (
      await call(
        `/api/rooms/${c.code}/sync`,
        { token: c.token, x: 0, z: 0, active: true },
        { zone: URL_ZONE },
      )
    ).body.stars.length,
    0,
  );
  const zoneValues = sql
    .prepare("SELECT zone_hash FROM ar_rooms")
    .all()
    .map((row) => row.zone_hash);
  assert(
    zoneValues.every(
      (z) => /^[a-f0-9]{64}$/.test(z) && z !== HEX_ZONE && z !== URL_ZONE,
    ),
  );
  assert(!JSON.stringify(two.body).includes(a.token));
  assert(!JSON.stringify(two.body).includes(HEX_ZONE));
});

test("appearance is bounded and persistent on resume and excludes arbitrary content", async (t) => {
  const { call, sql } = fixture(t);
  const path = "/api/markers/0/enter";
  const created = await call(path, {
    avatar: {
      name: "do not store",
      image: "data:x",
      shapeIndex: 8,
      baseColorIndex: 12,
      faceIndex: -1,
      stickers: [{ emoji: "no" }],
      paint: [{ color: "no" }],
      customization: {
        bodyColor: "#12ABEF",
        faceX: 999,
        faceScale: -2,
        eyeSpacing: 1.2,
        finish: "glossy",
        pattern: "dots",
        bad: "not stored",
      },
    },
  });
  assert.equal(created.status, 200);
  const a = created.body;
  const avatar = a.players[0].avatar;
  assert.equal(avatar.shapeIndex, 8);
  assert.equal(avatar.baseColorIndex, 12);
  assert.equal(avatar.faceIndex, 0);
  assert.equal(avatar.customization.bodyColor, "#12abef");
  assert.equal(avatar.customization.faceX, 0.25);
  assert.equal(avatar.customization.faceScale, 0.7);
  for (const k of ["name", "image", "stickers", "paint"])
    assert(!(k in avatar));
  assert(!("bad" in avatar.customization));
  assert(
    !sql
      .prepare("SELECT avatar FROM ar_players")
      .get()
      .avatar.includes("do not store"),
  );
  const resume = await call(path, { code: a.code, token: a.token });
  assert.equal(resume.body.token, a.token);
  assert.equal(resume.body.playerId, a.playerId);
  assert.deepEqual(resume.body.players[0].avatar, avatar);
  const b = await call(path);
  assert.deepEqual(
    b.body.players.find((p) => p.id === a.playerId).avatar,
    avatar,
  );
  const cleared = await call(path, {
    code: a.code,
    token: a.token,
    avatar: null,
  });
  assert.equal(cleared.body.players[0].avatar, null);
});

test("four-seat cap, disconnect/stale filtering, and clean room expiry", async (t) => {
  const { call, sql } = fixture(t);
  const path = "/api/markers/249/enter";
  const results = await Promise.all(
    Array.from({ length: 5 }, () => call(path)),
  );
  assert.deepEqual(
    results.map((i) => i.status).sort(),
    [200, 200, 200, 200, 409],
  );
  const a = results.find((i) => i.status === 200).body;
  const sync = `/api/rooms/${a.code}/sync`;
  const disconnected = await call(sync, {
    token: a.token,
    x: 0,
    z: 0,
    active: false,
  });
  assert(!disconnected.body.players.some((p) => p.id === a.playerId));
  sql.exec("UPDATE ar_players SET seen_at = 0");
  const resumed = await call(path, { token: a.token, code: a.code });
  assert.equal(resumed.body.playerId, a.playerId);
  assert.deepEqual(
    resumed.body.players.map((p) => p.id),
    [a.playerId],
  );
  sql.prepare("UPDATE ar_rooms SET expires_at=0 WHERE code=?").run(a.code);
  const fresh = await call(path, { token: a.token, code: a.code });
  assert.equal(fresh.status, 200);
  assert.notEqual(fresh.body.playerId, a.playerId);
  assert.equal(
    (await call(sync, { token: a.token, x: 0, z: 0, active: true })).status,
    404,
  );
  assert.equal((await call("/api/markers/250/enter")).status, 404);
});

test("exact Origin and valid family header are required, preflight is supported, oversized JSON is rejected", async (t) => {
  const { call } = fixture(t);
  const path = "/api/markers/42/enter";
  assert.equal(
    (await call(path, {}, { origin: "https://otherwise.example" })).status,
    403,
  );
  assert.equal((await call(path, {}, { origin: null })).status, 403);
  assert.equal((await call(path, {}, { zone: null })).status, 401);
  assert.equal((await call(path, {}, { zone: "hello" })).status, 401);
  assert.equal((await call(path, {}, { zone: "a".repeat(100) })).status, 401);
  assert.equal((await call(path, { name: "a".repeat(4096) })).status, 413);
  const preflight = await call(path, {}, { method: "OPTIONS", zone: null });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert(
    preflight.headers
      .get("Access-Control-Allow-Headers")
      .includes("X-Mallang-Zone"),
  );
});

test("two clients observe latest jump counters; old clients do not reset them", async (t) => {
  const { call } = fixture(t);
  const entry = "/api/markers/42/enter";
  const a = (await call(entry)).body;
  const b = (await call(entry)).body;
  const path = `/api/rooms/${a.code}/sync`;
  const pose = { x: 0, z: 0, active: true };
  const playerJump = (result, id) =>
    result.body.players.find((p) => p.id === id).jump;
  assert.equal(playerJump({ body: a }, a.playerId), 0);
  assert.equal(
    (await call(path, { ...pose, token: a.token, jump: 7 })).status,
    200,
  );
  assert.equal(
    playerJump(
      await call(path, { ...pose, token: b.token, jump: 1 }),
      a.playerId,
    ),
    7,
  );
  assert.equal(
    playerJump(await call(path, { ...pose, token: a.token }), b.playerId),
    1,
  );
  assert.equal(
    (await call(path, { ...pose, token: a.token, jump: 2.5 })).status,
    400,
  );
  assert.equal(
    playerJump(await call(path, { ...pose, token: b.token }), a.playerId),
    7,
  );
  assert.equal(
    playerJump(await call(entry, { code: a.code, token: a.token }), a.playerId),
    7,
  );
});
