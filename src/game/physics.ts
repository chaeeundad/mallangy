import type { Level } from "../data";
export const STEP = 1 / 60;
export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  grounded: boolean;
  facing: number;
  coyote: number;
  buffer: number;
};
export type Input = { left: boolean; right: boolean; jump: boolean };
export function createPlayer(x = 45): Player {
  return {
    x,
    y: 330,
    vx: 0,
    vy: 0,
    w: 38,
    h: 44,
    grounded: false,
    facing: 1,
    coyote: 0,
    buffer: 0,
  };
}
export function platforms(level: Level) {
  return [
    ...level.grounds.map(([x, w]) => ({ x, w, y: 410 })),
    ...level.platforms.map(([x, w, lift]) => ({ x, w, y: 410 - lift })),
  ];
}
export function stepPlayer(p: Player, input: Input, level: Level, dt: number) {
  const dir = Number(input.right) - Number(input.left);
  const target = dir * 270;
  const accel = p.grounded ? 2400 : 1550;
  p.vx += Math.max(-accel * dt, Math.min(accel * dt, target - p.vx));
  if (dir) p.facing = dir;
  p.coyote = p.grounded ? 0.115 : Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  let jumped = false;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -760;
    p.buffer = 0;
    p.coyote = 0;
    p.grounded = false;
    jumped = true;
  }
  if (!input.jump && p.vy < -260) p.vy = -260;
  const old = p.y + p.h;
  p.x = Math.max(0, Math.min(level.width - p.w, p.x + p.vx * dt));
  p.vy = Math.min(850, p.vy + 1600 * dt);
  p.y += p.vy * dt;
  p.grounded = false;
  for (const a of platforms(level)) {
    if (
      p.vy >= 0 &&
      old <= a.y + 0.1 &&
      p.y + p.h >= a.y &&
      p.x + p.w > a.x + 2 &&
      p.x < a.x + a.w - 2
    ) {
      p.y = a.y - p.h;
      p.vy = 0;
      p.grounded = true;
    }
  }
  return jumped;
}
