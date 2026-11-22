import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyBodyShape } from "../src/workshop/shapes";
import { attachToSurface } from "../src/workshop/surface";
import { normalizeDesign } from "../src/workshop/design";
import { STORY_PAGES, STORY_ACTION_IDS } from "../src/storybook/pages";
describe("face attachments follow the real body surface", () => {
  it("keeps the face footprint in front of every supported body, including the star", () => {
    for (let shape = 0; shape < 10; shape++) {
      const geometry = new THREE.SphereGeometry(1.34, 56, 40);
      applyBodyShape(
        geometry,
        geometry.attributes.position.array.slice() as Float32Array,
        shape,
      );
      const mesh = new THREE.Mesh(geometry),
        ray = new THREE.Raycaster();
      for (const [x, y] of [
        [-0.5, 0.3],
        [0.5, 0.3],
        [0, -0.25],
        [0, 0.25],
      ]) {
        const attachment = attachToSurface(geometry, x, y, 0.18, 0.12);
        const front = attachment.sample() + 0.075;
        for (const [dx, dy] of [
          [0, 0],
          [-0.18, 0],
          [0.18, 0],
          [0, 0.12],
          [0, -0.12],
        ]) {
          ray.set(
            new THREE.Vector3(x + dx, y + dy, 5),
            new THREE.Vector3(0, 0, -1),
          );
          const hit = ray.intersectObject(mesh, false)[0];
          expect(hit, `shape ${shape}`).toBeDefined();
          expect(front).toBeGreaterThan(hit.point.z + 0.07);
        }
      }
      geometry.dispose();
    }
  });
  it("tracks squeezing without binding to an old fixed depth", () => {
    const geometry = new THREE.SphereGeometry(1.34, 40, 30);
    const binding = attachToSurface(geometry, 0.28, 0.12, 0.07, 0.08),
      before = binding.sample(),
      p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - 0.25);
    expect(binding.sample()).toBeCloseTo(before - 0.25, 5);
    geometry.dispose();
  });
  it("bounds imported face and brush settings", () => {
    const design = normalizeDesign({
      faceScale: 999,
      faceY: NaN,
      eyeColor: "red",
      brushSize: -2,
    });
    expect(design.faceScale).toBe(1.3);
    expect(design.faceY).toBe(0);
    expect(design.eyeColor).toBe("#49394a");
    expect(design.brushSize).toBe(0.12);
  });
});
describe("the full illustrated story", () => {
  it("has 32 authored pages and uniquely identified activities", () => {
    expect(STORY_PAGES).toHaveLength(32);
    expect(new Set(STORY_PAGES.map((p) => p.title)).size).toBe(32);
    expect(new Set(STORY_ACTION_IDS).size).toBe(STORY_ACTION_IDS.length);
    for (const page of STORY_PAGES) {
      expect(page.paragraphs.join("").length).toBeGreaterThan(90);
      expect(page.actions.length).toBeGreaterThan(0);
    }
  });
});
