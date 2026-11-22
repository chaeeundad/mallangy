import { DEFAULT_HERO, type Hero } from "./data";
export type RecordScore = { stars: number; berries: number; time: number };
export type SaveData = {
  version: 2;
  hero: Hero;
  gallery: Hero[];
  records: Record<string, RecordScore>;
  settings: { sound: boolean; reducedMotion: boolean };
};
const KEY = "mallang-world-v2";
const index = (v: unknown, max: number, fallback = 0) =>
  Number.isInteger(v) && Number(v) >= 0 && Number(v) < max
    ? Number(v)
    : fallback;
const finite = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 100;
export function normalizeHero(value: unknown): Hero {
  const x = (value && typeof value === "object" ? value : {}) as Record<
    string,
    any
  >;
  return {
    ...DEFAULT_HERO,
    name: typeof x.name === "string" ? x.name.slice(0, 16) : DEFAULT_HERO.name,
    colorIndex: index(x.colorIndex, 16, 1),
    baseColorIndex: index(x.baseColorIndex ?? x.colorIndex, 16, 1),
    faceIndex: index(x.faceIndex, 4),
    shapeIndex: index(x.shapeIndex, 10),
    slangi: x.slangi === true,
    slangiSound: x.slangiSound === "icloud" ? "icloud" : "putty",
    stickers: Array.isArray(x.stickers)
      ? x.stickers
          .filter(
            (a: any) =>
              a &&
              typeof a.emoji === "string" &&
              a.emoji.length <= 8 &&
              finite(a.x) &&
              finite(a.y) &&
              finite(a.z),
          )
          .slice(0, 60)
      : [],
    paint: Array.isArray(x.paint)
      ? x.paint
          .filter(
            (a: any) =>
              a &&
              finite(a.x) &&
              finite(a.y) &&
              finite(a.z) &&
              /^#[\da-f]{6}$/i.test(a.color),
          )
          .slice(-1800)
      : [],
    crunch: Array.isArray(x.crunch)
      ? x.crunch
          .filter(
            (a: any) =>
              a &&
              finite(a.x) &&
              finite(a.y) &&
              finite(a.z) &&
              ["rainbow", "choco", "slime"].includes(a.kind) &&
              finite(a.hue) &&
              a.hue >= 0 &&
              a.hue < 1,
          )
          .slice(0, 150)
      : [],
  };
}
export function normalizeSave(input: unknown): SaveData {
  if (!input || typeof input !== "object" || (input as any).version !== 2)
    throw new Error("말랑이 여행의 저장 파일이 아니에요.");
  const x = input as any;
  const records: SaveData["records"] = {};
  for (let i = 0; i < 9; i++) {
    const r = x.records?.[i];
    if (
      r &&
      Number.isInteger(r.stars) &&
      r.stars >= 0 &&
      r.stars <= 10 &&
      Number.isInteger(r.berries) &&
      r.berries >= 0 &&
      r.berries <= 3 &&
      Number.isFinite(r.time) &&
      r.time >= 0
    )
      records[i] = { stars: r.stars, berries: r.berries, time: r.time };
  }
  return {
    version: 2,
    hero: normalizeHero(x.hero),
    gallery: Array.isArray(x.gallery)
      ? x.gallery.slice(0, 20).map(normalizeHero)
      : [],
    records,
    settings: {
      sound: x.settings?.sound !== false,
      reducedMotion: x.settings?.reducedMotion === true,
    },
  };
}
function read(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function loadSave(): SaveData {
  try {
    const x = read(KEY);
    if (x) return normalizeSave(x);
  } catch {}
  return {
    version: 2,
    hero: normalizeHero(read("malang-draft") || DEFAULT_HERO),
    gallery: (Array.isArray(read("malang-gallery"))
      ? read("malang-gallery")
      : []
    )
      .slice(0, 20)
      .map(normalizeHero),
    records: {},
    settings: {
      sound: true,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
  };
}
export let save = loadSave();
export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent("storage-error"));
    return false;
  }
}
export function replaceSave(value: unknown) {
  save = normalizeSave(value);
  return persist();
}
export function unlocked(id: number) {
  return id === 0 || !!save.records[id - 1];
}
export function recordLevel(
  id: number,
  stars: number,
  berries: number,
  time: number,
) {
  const old = save.records[id];
  save.records[id] = {
    stars: Math.max(old?.stars ?? 0, stars),
    berries: Math.max(old?.berries ?? 0, berries),
    time: old ? Math.min(old.time, time) : time,
  };
  return persist();
}
// Bridge for the original workshop keys; every write joins the versioned save.
export const workshopStorage = {
  getItem(key: string) {
    return JSON.stringify(key === "malang-draft" ? save.hero : save.gallery);
  },
  setItem(key: string, value: string) {
    const parsed = JSON.parse(value);
    if (key === "malang-draft") save.hero = normalizeHero(parsed);
    else if (key === "malang-gallery")
      save.gallery = parsed.map(normalizeHero).slice(0, 20);
    persist();
    window.dispatchEvent(new CustomEvent("save-changed"));
  },
};
