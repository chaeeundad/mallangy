import * as THREE from "three";
import { COLORS, DEFAULT_HERO, type Hero } from "../data";
import { normalizeDesign } from "../workshop/design";
import { applyBodyShape } from "../workshop/shapes";

/** Workshop geometry in marker units: feet at y=0, face toward +Z, width 0.9.
 * Paint strokes, stickers and crunch decorations are intentionally not included.
 * Animate/position the returned group without modifying the internal base offset.
 */
export function createMallangAvatar(
  hero: Partial<Hero> = DEFAULT_HERO,
): THREE.Group {
  const design = normalizeDesign(hero.customization);
  const index = Number.isInteger(hero.shapeIndex)
    ? Math.max(0, Math.min(9, hero.shapeIndex!))
    : DEFAULT_HERO.shapeIndex;
  const color =
    design.bodyColor ||
    COLORS[
      hero.baseColorIndex ?? hero.colorIndex ?? DEFAULT_HERO.baseColorIndex
    ] ||
    COLORS[1];
  const avatar = new THREE.Group();
  avatar.name = "mallang-avatar";
  const model = new THREE.Group();
  model.name = "mallang-model";
  avatar.add(model);
  const geometry = new THREE.SphereGeometry(1.34, 56, 40);
  applyBodyShape(
    geometry,
    new Float32Array(geometry.attributes.position.array),
    index,
  );
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color,
    roughness:
      design.finish === "soft" ? 0.8 : design.finish === "glossy" ? 0.2 : 0.08,
    clearcoat: design.finish === "soft" ? 0.1 : 1,
    clearcoatRoughness: design.finish === "soft" ? 0.6 : 0.08,
  });
  let surfaceMaterial = bodyMaterial;
  if (design.pattern !== "plain" || index === 9) {
    const base = new THREE.Color(color);
    const accent = new THREE.Color(design.patternColor);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const mixed = new THREE.Color();
    const caramel = new THREE.Color("#ac754d");
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      let blend = 0;
      if (design.pattern === "stripes")
        blend = Math.sin(y * 16) > 0.3 ? 0.65 : 0;
      if (design.pattern === "dots") {
        const u = Math.atan2(z, x) * 4;
        const v = y * 5;
        blend =
          Math.hypot(u - Math.round(u), v - Math.round(v)) < 0.2 ? 0.8 : 0;
      }
      if (design.pattern === "gradient")
        blend = THREE.MathUtils.clamp((y + 1.3) / 2.6, 0, 1);
      mixed.copy(base).lerp(accent, blend);
      if (index === 9 && y > 0.91)
        mixed.lerp(caramel, Math.min(1, (y - 0.91) * 5));
      mixed.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    surfaceMaterial = bodyMaterial.clone();
    surfaceMaterial.color.set(0xffffff);
    surfaceMaterial.vertexColors = true;
  }
  const body = new THREE.Mesh(geometry, surfaceMaterial);
  body.name = "body";
  body.scale.set(1, 1.08, 0.78);
  model.add(body);
  const ink = new THREE.MeshBasicMaterial({ color: design.eyeColor });
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const cheek = new THREE.MeshBasicMaterial({
    color: "#ff758f",
    transparent: true,
    opacity: design.cheekOpacity,
  });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: "#754557" });
  const accent = new THREE.MeshStandardMaterial({
    color: "#ff9fb8",
    roughness: 0.48,
  });
  const green = new THREE.MeshStandardMaterial({ color: "#69b774" });
  const orange = new THREE.MeshStandardMaterial({
    color: "#ffa52e",
    roughness: 0.32,
  });
  const seedMaterial = new THREE.MeshBasicMaterial({ color: "#ffefb6" });
  const add = (
    g: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    const mesh = new THREE.Mesh(g, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(...scale);
    body.add(mesh);
    return mesh;
  };
  const sphere = (radius: number) => new THREE.SphereGeometry(radius, 24, 18);
  // Sample the actual shaped surface in body-local coordinates, as the workshop does.
  const surface = new THREE.Mesh(geometry, bodyMaterial);
  const ray = new THREE.Raycaster();
  const surfaceZ = (x: number, y: number) => {
    ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
    return ray.intersectObject(surface, false)[0]?.point.z ?? 1.34;
  };
  const face = (
    g: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    offset: number,
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    x = x * design.faceScale + design.faceX;
    y = y * design.faceScale + design.faceY;
    return add(
      g,
      material,
      x,
      y,
      surfaceZ(x, y) + offset,
      scale.map((v) => v * design.faceScale) as [number, number, number],
    );
  };
  const expression = Number.isInteger(hero.faceIndex)
    ? Math.max(0, Math.min(3, hero.faceIndex!))
    : 0;
  for (const sign of [-1, 1]) {
    const x = sign * 0.28 * design.eyeSpacing;
    const eye = face(sphere(0.07), ink, x, 0.12, 0.04, [
      1,
      expression === 2 ? 0.38 : 1,
      1,
    ]);
    eye.name = sign < 0 ? "eye-left" : "eye-right";
    if (expression !== 2) face(sphere(0.022), white, x - 0.02, 0.15, 0.105);
    face(sphere(0.11), cheek, sign * 0.48, -0.11, 0.025, [1, 0.55, 0.35]);
  }
  const smile = face(
    new THREE.TorusGeometry(0.115, 0.026, 10, 28, Math.PI),
    mouthMaterial,
    0,
    -0.12,
    0.04,
    expression === 1
      ? [1.25, 1.3, 1]
      : expression === 2
        ? [0.7, 0.7, 1]
        : [1, 1, 1],
  );
  smile.rotation.z = expression === 3 ? Math.PI + 0.22 : Math.PI;
  smile.name = "smile";
  if (index === 7) {
    smile.visible = false;
    face(sphere(0.17), orange, 0, -0.1, 0.12, [1.25, 0.62, 0.7]);
  }
  if (index === 3 || index === 5) {
    const cfg =
      index === 3
        ? { x: 0.58, y: 1.14, r: 0.3, h: 1.22 }
        : { x: 0.76, y: 0.92, r: 0.25, h: 0.8 };
    for (const sign of [-1, 1])
      add(sphere(cfg.r), bodyMaterial, sign * cfg.x, cfg.y, 0, [
        0.72,
        cfg.h,
        0.55,
      ]);
  }
  if (index === 4) {
    for (const sign of [-1, 1]) {
      const ear = add(
        sphere(1),
        bodyMaterial,
        sign * 0.43,
        1.69,
        0.015,
        [0.19, 0.56, 0.12],
      );
      ear.rotation.z = -sign * 0.14;
      const inner = add(
        sphere(1),
        accent,
        sign * 0.43,
        1.72,
        0.126,
        [0.095, 0.37, 0.025],
      );
      inner.rotation.z = ear.rotation.z;
    }
  }
  if (index === 6) {
    for (const x of [-0.46, 0.46]) {
      add(sphere(0.27), bodyMaterial, x, 0.93, 0.53);
      add(sphere(0.12), white, x, 0.97, 0.76);
      add(sphere(0.055), ink, x, 0.97, 0.86);
    }
  }
  if (index === 1 || index === 8) {
    add(sphere(0.13), green, 0.06, 1.27, 0, [0.45, 1.2, 0.42]);
    if (index === 8) {
      for (const y of [0.57, 0.22, -0.15, -0.52]) {
        for (const x of [-0.38, -0.12, 0.14, 0.4]) {
          if (Math.abs(x) + Math.abs(y) < 0.82)
            add(
              sphere(0.03),
              seedMaterial,
              x,
              y,
              surfaceZ(x, y) + 0.025,
              [1, 1.2, 0.72],
            );
        }
      }
    }
  }
  if (
    surfaceMaterial !== bodyMaterial &&
    !body.children.some(
      (child) => child instanceof THREE.Mesh && child.material === bodyMaterial,
    )
  )
    bodyMaterial.dispose();
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const scale = 0.9 / (bounds.max.x - bounds.min.x);
  model.scale.setScalar(scale);
  model.position.set(
    -(bounds.min.x + bounds.max.x) * 0.5 * scale,
    -bounds.min.y * scale,
    0,
  );
  avatar.userData.shapeIndex = index;
  avatar.userData.prototype = true;
  return avatar;
}

/** Releases resources when an AR session is destroyed, including shared materials once. */
export function disposeMallangAvatar(avatar: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  avatar.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  avatar.removeFromParent();
}
