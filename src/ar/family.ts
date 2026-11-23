const STORAGE_KEY = "mallang-ar-family-v1";
const FAMILY_TOKEN = /^[A-Za-z0-9_-]{22,64}$/;

export function isFamilyToken(value: unknown): value is string {
  return typeof value === "string" && FAMILY_TOKEN.test(value);
}

/** A capability link: keep it in the URL fragment, never the request path or analytics. */
export function createFamilyToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function storeFamilyToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {}
}

export function loadFamilyToken(): string {
  const fromLink = new URLSearchParams(location.hash.slice(1));
  if (fromLink.has("family")) {
    const token = fromLink.get("family");
    // An invalid invitation must never silently put someone in another room.
    if (!isFamilyToken(token)) return "";
    storeFamilyToken(token);
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
    return token;
  }
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    if (isFamilyToken(token)) return token;
  } catch {}
  return "";
}

export function familyLink(token: string): string {
  const url = new URL(location.pathname, location.origin);
  url.hash = new URLSearchParams({ family: token }).toString();
  return url.toString();
}
