/**
 * Same-origin bridge to the independently deployed Cloudflare Worker.
 * Never forwards browser cookies, URLs supplied by the client, or camera data.
 */
export async function bridge(request, options = {}) {
  const endpoint = options.endpoint ?? process.env.MALLANG_AR_BACKEND_URL;
  const fetcher = options.fetcher ?? fetch;
  const json = (code, error) =>
    Response.json(
      { error },
      { status: code, headers: { "Cache-Control": "no-store" } },
    );
  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  }
  const params = new URL(request.url).searchParams;
  const type = params.get("type"),
    id = params.get("id") || "";
  let path;
  if (type === "marker" && /^\d{1,3}$/.test(id) && +id <= 249)
    path = "/api/markers/" + id + "/enter";
  else if (type === "room" && /^[23456789A-HJ-NP-Z]{6}$/.test(id))
    path = "/api/rooms/" + id + "/sync";
  else return json(404, "not_found");

  const origin = request.headers.get("origin");
  const zone = request.headers.get("x-mallang-zone");
  if (!origin || !zone || !/^[A-Za-z0-9_-]{22,64}$/.test(zone))
    return json(403, "family_link_required");
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return json(400, "invalid_json");

  let host;
  try {
    host = new URL(endpoint || "");
    if (
      host.protocol !== "https:" ||
      host.username ||
      host.password ||
      host.pathname !== "/" ||
      host.search ||
      host.hash
    )
      throw new Error();
  } catch {
    return json(503, "room_service_unavailable");
  }

  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return json(413, "request_too_large");
      }
      chunks.push(value);
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } catch {
    return json(400, "invalid_json");
  }
  try {
    const result = await fetcher(new URL(path, host), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "X-Mallang-Zone": zone,
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    if (!result.headers.get("Content-Type")?.includes("application/json"))
      return json(502, "room_service_unavailable");
    return new Response(result.body, {
      status: result.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return json(502, "room_service_unavailable");
  }
}

export default { fetch: bridge };
