import { DEFAULT_HERO, type Hero } from "../data";
import { normalizeDesign, type Customization } from "../workshop/design";

type VisibleDesign = Omit<
  Customization,
  "brushColor" | "brushSize" | "brushStrength"
>;
export type ArAppearance = Pick<
  Hero,
  "shapeIndex" | "baseColorIndex" | "colorIndex" | "faceIndex"
> & {
  customization: VisibleDesign;
};

/** A deliberately explicit, bounded network representation, never the full save. */
export function arAppearance(value: unknown): ArAppearance {
  const input = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const index = (v: unknown, max: number, fallback: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v < max
      ? v
      : fallback;
  const d = normalizeDesign(input.customization);
  return {
    shapeIndex: index(input.shapeIndex, 10, DEFAULT_HERO.shapeIndex),
    baseColorIndex: index(
      input.baseColorIndex ?? input.colorIndex,
      16,
      DEFAULT_HERO.baseColorIndex,
    ),
    colorIndex: index(input.colorIndex, 16, DEFAULT_HERO.colorIndex),
    faceIndex: index(input.faceIndex, 4, DEFAULT_HERO.faceIndex),
    customization: {
      bodyColor: d.bodyColor,
      pattern: d.pattern,
      patternColor: d.patternColor,
      finish: d.finish,
      faceX: d.faceX,
      faceY: d.faceY,
      faceScale: d.faceScale,
      eyeSpacing: d.eyeSpacing,
      eyeColor: d.eyeColor,
      cheekOpacity: d.cheekOpacity,
    },
  };
}

/** The renderer normalizes design itself, filling unused brush defaults locally. */
export function appearanceHero(value: ArAppearance): Partial<Hero> {
  return { ...value, customization: normalizeDesign(value.customization) };
}
