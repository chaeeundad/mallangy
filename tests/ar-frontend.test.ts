import { afterEach, describe, expect, it, vi } from "vitest";
import { Mesh, MeshPhysicalMaterial } from "three";
import { arAppearance, appearanceHero } from "../src/ar/appearance";
import { createMallangAvatar, disposeMallangAvatar } from "../src/ar/avatar";
import {
  createFamilyToken,
  familyLink,
  isFamilyToken,
  loadFamilyToken,
} from "../src/ar/family";

afterEach(() => vi.unstubAllGlobals());

describe("local AR avatar", () => {
  it("shares bounded looks and excludes all names, user art, and brush controls", () => {
    const look = arAppearance({
      name: "Sensitive name",
      shapeIndex: 8,
      baseColorIndex: 11,
      faceIndex: 2,
      paint: [{ color: "#aa0000" }],
      stickers: [{ emoji: "personal" }],
      customization: {
        bodyColor: "#AA3411",
        pattern: "gradient",
        finish: "jelly",
        faceScale: 1000,
        cheekOpacity: -9,
        brushColor: "#123456",
      },
    });
    expect(look).toMatchObject({
      shapeIndex: 8,
      baseColorIndex: 11,
      faceIndex: 2,
      customization: {
        bodyColor: "#AA3411",
        pattern: "gradient",
        finish: "jelly",
        faceScale: 1.3,
        cheekOpacity: 0,
      },
    });
    const payload = JSON.stringify(look);
    expect(payload).not.toMatch(
      /Sensitive|personal|name|paint|stickers|brush|123456/,
    );
    expect(arAppearance({ shapeIndex: 15, faceIndex: -1 }).shapeIndex).toBe(0);
  });

  it("renders saved looks as colored geometry and bounded facial expressions", () => {
    const avatar = createMallangAvatar(
      appearanceHero(
        arAppearance({
          shapeIndex: 2,
          faceIndex: 2,
          customization: { pattern: "stripes", finish: "jelly" },
        }),
      ),
    );
    try {
      const body = avatar.getObjectByName("body") as Mesh;
      const eye = avatar.getObjectByName("eye-left")!;
      expect(avatar.userData.shapeIndex).toBe(2);
      expect(body.geometry.hasAttribute("color")).toBe(true);
      expect(body.material).toBeInstanceOf(MeshPhysicalMaterial);
      expect((body.material as MeshPhysicalMaterial).roughness).toBe(0.08);
      expect(eye.scale.y).toBeCloseTo(0.38);
    } finally {
      disposeMallangAvatar(avatar);
    }
  });
});

describe("family invitation capability", () => {
  function page(hash: string) {
    const store = new Map<string, string>();
    const replaceState = vi.fn();
    vi.stubGlobal("location", {
      hash,
      pathname: "/ar/",
      search: "?test=value",
      origin: "https://example.test",
    });
    vi.stubGlobal("history", { state: null, replaceState });
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => store.set(key, value),
      getItem: (key: string) => store.get(key) ?? null,
    });
    return { store, replaceState };
  }

  it("creates random URL-fragment capabilities", () => {
    const token = createFamilyToken();
    page("");
    const link = new URL(familyLink(token));
    expect(token).toMatch(/^[a-f0-9]{48}$/);
    expect(createFamilyToken()).not.toBe(token);
    expect(isFamilyToken(token)).toBe(true);
    expect(link.pathname).toBe("/ar/");
    expect(link.search).toBe("");
    expect(link.hash).toBe("#family=" + token);
  });

  it("persists a valid invite and does not enter a saved room on invalid invite", () => {
    const token = createFamilyToken();
    const { store, replaceState } = page("#family=" + token);
    expect(loadFamilyToken()).toBe(token);
    expect([...store.values()]).toEqual([token]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/ar/?test=value");
    vi.stubGlobal("location", { hash: "#family=invalid" });
    expect(loadFamilyToken()).toBe("");
    vi.stubGlobal("location", { hash: "" });
    expect(loadFamilyToken()).toBe(token);
  });
});
