import * as THREE from "three";
type Sample = { indices: [number, number, number]; weights: THREE.Vector3 };
/** Bind to real front-facing triangles, then replay their barycentric deformation. */
export function attachToSurface(
  geometry: THREE.BufferGeometry,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  const surface = new THREE.Mesh(geometry),
    ray = new THREE.Raycaster(),
    samples: Sample[] = [];
  for (const [dx, dy] of [
    [0, 0],
    [-rx, 0],
    [rx, 0],
    [0, -ry],
    [0, ry],
    [-rx * 0.7, -ry * 0.7],
    [rx * 0.7, -ry * 0.7],
    [-rx * 0.7, ry * 0.7],
    [rx * 0.7, ry * 0.7],
  ]) {
    ray.set(new THREE.Vector3(x + dx, y + dy, 5), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(surface, false)[0];
    if (!hit?.face) continue;
    const { a, b, c } = hit.face,
      positions = geometry.attributes.position;
    const v = (i: number) =>
      new THREE.Vector3().fromBufferAttribute(positions, i);
    const weights = THREE.Triangle.getBarycoord(
      hit.point,
      v(a),
      v(b),
      v(c),
      new THREE.Vector3(),
    );
    if (weights) samples.push({ indices: [a, b, c], weights });
  }
  const vertex = new THREE.Vector3();
  return {
    sample() {
      let z = -Infinity;
      for (const sample of samples) {
        let depth = 0;
        sample.indices.forEach((index, i) => {
          vertex.fromBufferAttribute(geometry.attributes.position, index);
          depth += vertex.z * sample.weights.getComponent(i);
        });
        z = Math.max(z, depth);
      }
      return Number.isFinite(z) ? z : 1.5;
    },
  };
}
