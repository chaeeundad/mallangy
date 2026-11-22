export type Customization = {
  bodyColor: string;
  pattern: "plain" | "dots" | "stripes" | "gradient";
  patternColor: string;
  finish: "soft" | "glossy" | "jelly";
  faceX: number;
  faceY: number;
  faceScale: number;
  eyeSpacing: number;
  eyeColor: string;
  cheekOpacity: number;
  brushColor: string;
  brushSize: number;
  brushStrength: number;
};
export const DEFAULT_DESIGN: Customization = {
  bodyColor: "",
  pattern: "plain",
  patternColor: "#fff0cf",
  finish: "soft",
  faceX: 0,
  faceY: 0,
  faceScale: 1,
  eyeSpacing: 1,
  eyeColor: "#49394a",
  cheekOpacity: 0.52,
  brushColor: "#ed79c5",
  brushSize: 0.42,
  brushStrength: 0.88,
};
const bounded = (value: unknown, min: number, max: number, base: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : base;
const hex = (v: unknown, base: string) =>
  typeof v === "string" && /^#[\da-f]{6}$/i.test(v) ? v : base;
export function normalizeDesign(value: unknown): Customization {
  const x = (
    value && typeof value === "object" ? value : {}
  ) as Partial<Customization>;
  return {
    ...DEFAULT_DESIGN,
    bodyColor: hex(x.bodyColor, ""),
    pattern: ["plain", "dots", "stripes", "gradient"].includes(x.pattern || "")
      ? x.pattern!
      : DEFAULT_DESIGN.pattern,
    patternColor: hex(x.patternColor, DEFAULT_DESIGN.patternColor),
    finish: ["soft", "glossy", "jelly"].includes(x.finish || "")
      ? x.finish!
      : DEFAULT_DESIGN.finish,
    faceX: bounded(x.faceX, -0.25, 0.25, 0),
    faceY: bounded(x.faceY, -0.28, 0.28, 0),
    faceScale: bounded(x.faceScale, 0.7, 1.3, 1),
    eyeSpacing: bounded(x.eyeSpacing, 0.65, 1.4, 1),
    eyeColor: hex(x.eyeColor, DEFAULT_DESIGN.eyeColor),
    cheekOpacity: bounded(x.cheekOpacity, 0, 0.8, 0.52),
    brushColor: hex(x.brushColor, DEFAULT_DESIGN.brushColor),
    brushSize: bounded(x.brushSize, 0.12, 0.75, 0.42),
    brushStrength: bounded(x.brushStrength, 0.15, 1, 0.88),
  };
}
export const DESIGN_PRESETS = [
  {
    name: "딸기 우유",
    color: "#efafc2",
    pattern: "dots",
    patternColor: "#fff1d8",
    shape: 0,
    finish: "soft",
  },
  {
    name: "별빛 파자마",
    color: "#b5a0d4",
    pattern: "stripes",
    patternColor: "#eee7fa",
    shape: 2,
    finish: "soft",
  },
  {
    name: "민트 초코",
    color: "#91cbb1",
    pattern: "dots",
    patternColor: "#8f6c5e",
    shape: 5,
    finish: "glossy",
  },
  {
    name: "구름 사탕",
    color: "#9bcce1",
    pattern: "gradient",
    patternColor: "#f3bdd9",
    shape: 4,
    finish: "jelly",
  },
] as const;
