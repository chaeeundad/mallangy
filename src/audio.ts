import { save } from "./storage";
let ctx: AudioContext | undefined;
export function chime(
  kind: "jump" | "star" | "berry" | "finish" | "tap",
  enabled = save.settings.sound,
) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const notes =
      kind === "finish"
        ? [523, 659, 784, 1047]
        : kind === "star"
          ? [880, 1175]
          : kind === "berry"
            ? [659, 880]
            : kind === "jump"
              ? [260, 480]
              : [540];
    notes.forEach((freq, i) => {
      const o = ctx!.createOscillator(),
        g = ctx!.createGain(),
        at = ctx!.currentTime + i * 0.075;
      o.type = "sine";
      o.frequency.setValueAtTime(freq, at);
      if (kind === "jump")
        o.frequency.exponentialRampToValueAtTime(freq * 1.3, at + 0.09);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.055, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(at);
      o.stop(at + 0.2);
    });
  } catch {}
}
