import assert from "node:assert/strict";
import { test } from "node:test";
import { bridge } from "../api/mallang-ar.js";
const origin = "https://mallangy.test";
const zone = "a".repeat(32);
const headers = {
  Origin: origin,
  "X-Mallang-Zone": zone,
  "Content-Type": "application/json",
};
const req = (query, body = "{}", extra = {}) =>
  new Request(origin + "/api/mallang-ar?" + query, {
    method: "POST",
    headers: { ...headers, ...extra },
    body,
  });
test("proxy forwards only allowed AR route, origin and family token", async () => {
  const result = await bridge(
    req("type=marker&id=42", '{"avatar":{"shapeIndex":2}}', {
      Cookie: "other-game=private",
    }),
    {
      endpoint: "https://worker.test",
      async fetcher(url, args) {
        assert.equal(url.href, "https://worker.test/api/markers/42/enter");
        assert.equal(args.headers.Origin, origin);
        assert.equal(args.headers["X-Mallang-Zone"], zone);
        assert(!args.headers.Cookie);
        assert.deepEqual(JSON.parse(new TextDecoder().decode(args.body)), {
          avatar: { shapeIndex: 2 },
        });
        return Response.json({ ok: true });
      },
    },
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(await result.json(), { ok: true });
});
test("proxy fails closed with no family link, invalid path, missing backend or oversized body", async () => {
  const config = {
    endpoint: "https://worker.test",
    fetcher: () => {
      throw new Error("Should not contact upstream");
    },
  };
  assert.equal(
    (
      await bridge(
        req("type=room&id=ABC234", "{}", { "X-Mallang-Zone": "short" }),
        config,
      )
    ).status,
    403,
  );
  assert.equal(
    (await bridge(req("type=room&id=https://untrusted.test"), config)).status,
    404,
  );
  assert.equal((await bridge(req("type=marker&id=999"), config)).status, 404);
  assert.equal(
    (await bridge(req("type=marker&id=42"), { ...config, endpoint: "" }))
      .status,
    503,
  );
  assert.equal(
    (await bridge(req("type=marker&id=42", " ".repeat(4097)), config)).status,
    413,
  );
});
test("replay bridge preserves the authenticated round request and never caches it", async () => {
  const result = await bridge(
    req("type=reset&id=ABC234", '{"token":"test-token","round":1}'),
    {
      endpoint: "https://worker.test",
      async fetcher(url, options) {
        assert.equal(url.href, "https://worker.test/api/rooms/ABC234/reset");
        assert.deepEqual(JSON.parse(new TextDecoder().decode(options.body)), {
          token: "test-token",
          round: 1,
        });
        return Response.json({ round: 2, stars: [] });
      },
    },
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(await result.json(), { round: 2, stars: [] });
});
