import type * as THREE from "three";
export function applyBodyShape(
  geometry: THREE.BufferGeometry,
  unitPositions: Float32Array,
  index: number,
) {
  const a = geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    let x = unitPositions[i * 3],
      y = unitPositions[i * 3 + 1],
      z = unitPositions[i * 3 + 2],
      r = 1;
    const theta = Math.atan2(z, x),
      phi = Math.acos(Math.max(-1, Math.min(1, y / 1.34))),
      yn = y / 1.34;
    if (index === 1) r = 1 - 0.1 * yn + 0.045 * Math.cos(phi * 2);
    if (index === 2)
      r =
        1 +
        0.24 *
          Math.cos((Math.atan2(y, x) - Math.PI / 2) * 5) *
          Math.pow(Math.hypot(x, y) / 1.34, 1.3);
    if (index === 3) r = 1 + 0.06 * Math.max(0, yn);
    if (index === 4) r = 1 - 0.035 * yn;
    if (index === 5) r = 1 + 0.025 * yn;
    if (index === 6) r = 1 - 0.1 * yn;
    if (index === 7) r = 1 + 0.12 * yn;
    if (index === 8) r = 1 + 0.25 * yn;
    if (index === 9) r = 1 + 0.1 * yn;
    a.setXYZ(i, x * r, y * r * (index === 9 ? 0.82 : 1), z * r);
  }

  a.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
