import { beforeAll, describe, it, expect, vi } from "vitest";
let storage: typeof import("../src/storage");
beforeAll(async () => {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) || null,
    setItem: (k: string, v: string) => map.set(k, v),
  });
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  storage = await import("../src/storage");
});
describe("save validation and progression", () => {
  it("rejects unrelated backup formats", () =>
    expect(() => storage.normalizeSave({ version: 99 })).toThrow());
  it("sanitizes malformed creations", () => {
    const h = storage.normalizeHero({
      name: "x".repeat(50),
      shapeIndex: 999,
      colorIndex: -8,
      stickers: [{ emoji: "ok", x: NaN, y: 0, z: 0 }],
      paint: [{ x: 0, y: 0, z: 0, color: "javascript:bad" }],
      crunch: [null],
    });
    expect(h.name).toHaveLength(16);
    expect(h.shapeIndex).toBe(0);
    expect(h.colorIndex).toBe(1);
    expect(h.paint).toEqual([]);
    expect(h.stickers).toEqual([]);
    expect(h.crunch).toEqual([]);
  });
  it("keeps best collectibles and fastest completion separately", () => {
    storage.recordLevel(0, 7, 2, 50);
    storage.recordLevel(0, 3, 3, 70);
    expect(storage.save.records[0]).toEqual({ stars: 7, berries: 3, time: 50 });
    expect(storage.unlocked(1)).toBe(true);
    expect(storage.unlocked(2)).toBe(false);
  });
  it("discards invalid scores in imported backups", () => {
    const value = storage.normalizeSave({
      version: 2,
      records: {
        0: { stars: 80, berries: 3, time: 9 },
        1: { stars: 3, berries: 2, time: 10 },
      },
    });
    expect(value.records[0]).toBeUndefined();
    expect(value.records[1].stars).toBe(3);
  });
  it("survives unavailable storage without reporting a successful write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(storage.persist()).toBe(false);
  });
});
