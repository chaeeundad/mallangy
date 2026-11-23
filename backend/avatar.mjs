const record = (v) => v && typeof v === "object" && !Array.isArray(v);
const int = (v, max, fallback) =>
  Number.isInteger(v) && v >= 0 && v <= max ? v : fallback;
const num = (v, min, max, fallback) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const hex = (v, fallback) =>
  typeof v === "string" && /^#[a-f0-9]{6}$/i.test(v)
    ? v.toLowerCase()
    : fallback;
const oneOf = (v, opts, fallback) => (opts.includes(v) ? v : fallback);

/** Serialize appearance only. Ignore all unrecognized metadata and media. */
export function normalizeAvatar(avatar) {
  if (!record(avatar)) return null;
  const color = int(avatar.baseColorIndex ?? avatar.colorIndex, 15, 1);
  const result = {
    shapeIndex: int(avatar.shapeIndex, 9, 0),
    baseColorIndex: color,
    colorIndex: color,
    faceIndex: int(avatar.faceIndex, 9, 0),
  };
  const d = avatar.customization;
  if (record(d)) {
    result.customization = {
      bodyColor: hex(d.bodyColor, ""),
      pattern: oneOf(
        d.pattern,
        ["plain", "dots", "stripes", "gradient"],
        "plain",
      ),
      patternColor: hex(d.patternColor, "#fff0cf"),
      finish: oneOf(d.finish, ["soft", "glossy", "jelly"], "soft"),
      faceX: num(d.faceX, -0.25, 0.25, 0),
      faceY: num(d.faceY, -0.28, 0.28, 0),
      faceScale: num(d.faceScale, 0.7, 1.3, 1),
      eyeSpacing: num(d.eyeSpacing, 0.65, 1.4, 1),
      eyeColor: hex(d.eyeColor, "#49394a"),
      cheekOpacity: num(d.cheekOpacity, 0, 0.8, 0.52),
    };
  }
  return result;
}
