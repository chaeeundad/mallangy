import * as T from "three";

export const REVEAL_RADIUS = 0.58;
export const STAR_HEIGHT = 0.34;

/** The entire diorama is in marker units, with its walking surface at y=0. */
export function createTerrain(hideouts: { x: number; z: number }[]) {
  const root = new T.Group();
  root.name = "marker-island";
  const outline = new T.Shape();
  const p = 1.72,
    r = 0.28;
  outline.moveTo(-p + r, -p);
  outline.lineTo(p - r, -p);
  outline.quadraticCurveTo(p, -p, p, -p + r);
  outline.lineTo(p, p - r);
  outline.quadraticCurveTo(p, p, p - r, p);
  outline.lineTo(-p + r, p);
  outline.quadraticCurveTo(-p, p, -p, p - r);
  outline.lineTo(-p, -p + r);
  outline.quadraticCurveTo(-p, -p, -p + r, -p);
  const board = new T.Mesh(
    new T.ExtrudeGeometry(outline, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.055,
      bevelSegments: 2,
      curveSegments: 10,
    }),
    [
      new T.MeshStandardMaterial({ color: "#a9d49c", roughness: 0.83 }),
      new T.MeshStandardMaterial({ color: "#7eac83", roughness: 0.82 }),
    ],
  );
  board.rotation.x = -Math.PI / 2;
  board.position.y = -0.157;
  root.add(board);

  const field = new T.Mesh(
    new T.CircleGeometry(0.45, 32),
    new T.MeshBasicMaterial({
      color: "#cddca4",
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.002;
  root.add(field);
  const trail = new T.Mesh(
    new T.RingGeometry(0.69, 0.87, 56),
    new T.MeshBasicMaterial({
      color: "#d8e1aa",
      transparent: true,
      opacity: 0.55,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  trail.rotation.x = -Math.PI / 2;
  trail.position.y = 0.003;
  root.add(trail);

  const rockGeo = new T.IcosahedronGeometry(1, 0);
  const shrubGeo = new T.IcosahedronGeometry(1, 1);
  const rock = new T.MeshStandardMaterial({
    color: "#aca1c8",
    roughness: 0.94,
    flatShading: true,
  });
  const rockSmall = new T.MeshStandardMaterial({
    color: "#d0b9c5",
    roughness: 0.91,
    flatShading: true,
  });
  const shrub = new T.MeshStandardMaterial({
    color: "#6ca979",
    roughness: 0.85,
  });
  const shrubSmall = new T.MeshStandardMaterial({
    color: "#8abd75",
    roughness: 0.85,
  });
  const cap = new T.MeshStandardMaterial({ color: "#d77b9c", roughness: 0.61 });
  const stem = new T.MeshStandardMaterial({
    color: "#f0dfb8",
    roughness: 0.91,
  });
  const stalk = new T.CylinderGeometry(0.016, 0.024, 0.09, 7);
  const mushroom = new T.SphereGeometry(
    1,
    12,
    8,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58,
  );

  function little(
    g: T.BufferGeometry,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    angle = 0,
  ) {
    const mesh = new T.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = angle;
    root.add(mesh);
  }
  const locations = [
    ...hideouts,
    { x: -0.48, z: -0.65 },
    { x: 0.42, z: 0.68 },
    { x: 1.38, z: 0.48 },
    { x: -1.5, z: 0.35 },
  ];
  locations.forEach((p, i) => {
    const angle = i * 2.397;
    const ox = Math.cos(angle) * 0.09,
      oz = Math.sin(angle) * 0.09;
    if (i % 3 === 0) {
      little(
        rockGeo,
        rock,
        p.x + ox,
        0.082,
        p.z + oz,
        0.205,
        0.151,
        0.16,
        angle,
      );
      little(
        rockGeo,
        rockSmall,
        p.x - 0.13,
        0.04,
        p.z + 0.06,
        0.084,
        0.063,
        0.08,
        angle + 1,
      );
    } else if (i % 3 === 1) {
      little(
        shrubGeo,
        shrub,
        p.x + ox,
        0.097,
        p.z + oz,
        0.186,
        0.145,
        0.145,
        angle,
      );
      little(
        shrubGeo,
        shrubSmall,
        p.x - 0.07,
        0.055,
        p.z - 0.095,
        0.115,
        0.093,
        0.108,
        angle,
      );
      little(
        shrubGeo,
        shrubSmall,
        p.x + 0.105,
        0.052,
        p.z + 0.08,
        0.074,
        0.072,
        0.07,
        angle,
      );
    } else {
      little(stalk, stem, p.x + ox, 0.047, p.z + oz, 1, 1, 1);
      little(
        mushroom,
        cap,
        p.x + ox,
        0.103,
        p.z + oz,
        0.1,
        0.063,
        0.095,
        angle,
      );
      little(stalk, stem, p.x - 0.065, 0.036, p.z + 0.055, 0.8, 0.8, 0.8);
      little(
        mushroom,
        cap,
        p.x - 0.065,
        0.084,
        p.z + 0.055,
        0.068,
        0.048,
        0.061,
        angle,
      );
    }
  });
  // Small pastel stepping stones make the otherwise plain center easy to navigate.
  const pebble = new T.MeshStandardMaterial({
    color: "#e3d8bb",
    roughness: 0.96,
  });
  for (let i = 0; i < 10; i++) {
    const t = i * Math.PI * 0.2;
    little(
      rockGeo,
      pebble,
      Math.cos(t) * 0.34,
      0.006,
      Math.sin(t) * 0.34,
      0.029,
      0.013,
      0.026,
      i,
    );
  }
  return root;
}
