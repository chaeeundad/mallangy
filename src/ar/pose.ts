export type P2 = { x: number; y: number };
export type Vec = [number, number, number];
const model: P2[] = [
  { x: -0.5, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: 0.5, y: 0.5 },
  { x: -0.5, y: 0.5 },
];
const norm = (v: Vec): number => Math.hypot(...v);
const mul = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];
const dot = (x: Vec, y: Vec) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
const subtract = (a: Vec, b: Vec): Vec => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const toThree = (v: Vec): Vec => [v[0], -v[1], -v[2]];

/** Decompose normalized image homography. ArUco order: TL, TR, BR, BL in marker axes. */
export function estimatePose(corners: P2[], w: number, h: number, f: number) {
  if (corners.length !== 4 || !(w > 0 && h > 0 && f > 0)) return null;
  const rows: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = model[i],
      u = (corners[i].x - w / 2) / f,
      v = (corners[i].y - h / 2) / f;
    rows.push(
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    );
  }
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let j = c + 1; j < 8; j++)
      if (Math.abs(rows[j][c]) > Math.abs(rows[pivot][c])) pivot = j;
    if (!Number.isFinite(rows[pivot][c]) || Math.abs(rows[pivot][c]) < 1e-8)
      return null;
    [rows[c], rows[pivot]] = [rows[pivot], rows[c]];
    const k = rows[c][c];
    for (let j = c; j <= 8; j++) rows[c][j] /= k;
    for (let i = 0; i < 8; i++)
      if (i !== c) {
        const factor = rows[i][c];
        for (let j = c; j <= 8; j++) rows[i][j] -= factor * rows[c][j];
      }
  }
  const [a, b, c, d, e, g, i, j] = rows.map((r) => r[8]);
  const one: Vec = [a, d, i],
    two: Vec = [b, e, j];
  const n1 = norm(one),
    n2 = norm(two),
    s = 2 / (n1 + n2);
  if (
    !Number.isFinite(s) ||
    s < 0.35 ||
    s > 70 ||
    Math.max(n1, n2) > 2.1 * Math.min(n1, n2)
  )
    return null;
  const right = mul(one, 1 / n1),
    down0 = subtract(two, mul(right, dot(right, two)));
  const nd = norm(down0);
  if (nd < 1e-8) return null;
  const down = mul(down0, 1 / nd);
  return {
    position: toThree([c * s, g * s, s]),
    right: toThree(right),
    up: toThree(mul(cross(right, down), -1)),
    front: toThree(down),
  };
}
