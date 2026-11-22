import { describe, it, expect } from "vitest";
import { makeLevel } from "../src/data";
import { createPlayer, stepPlayer, STEP } from "../src/game/physics";
const none = { left: false, right: false, jump: false };
describe("forgiving platform movement", () => {
  it("lands at the same height across every stage", () => {
    for (let id = 0; id < 9; id++) {
      const p = createPlayer();
      for (let i = 0; i < 90; i++) stepPlayer(p, none, makeLevel(id), STEP);
      expect(p.grounded).toBe(true);
      expect(p.y + p.h).toBe(410);
    }
  });
  it("allows a jump shortly after walking off a ledge", () => {
    const p = createPlayer();
    p.x = 604;
    p.y = 366;
    p.grounded = true;
    p.vx = 270;
    stepPlayer(p, { ...none, right: true }, makeLevel(0), STEP);
    p.x = 655;
    p.grounded = false;
    p.buffer = 0.13;
    expect(stepPlayer(p, { ...none, jump: true }, makeLevel(0), STEP)).toBe(
      true,
    );
    expect(p.vy).toBeLessThan(0);
  });
  it("buffers a jump just before landing", () => {
    const p = createPlayer();
    p.y = 365;
    p.vy = 200;
    p.buffer = 0.13;
    stepPlayer(p, { ...none, jump: true }, makeLevel(0), STEP);
    expect(p.grounded).toBe(true);
    expect(stepPlayer(p, { ...none, jump: true }, makeLevel(0), STEP)).toBe(
      true,
    );
  });
  it("holding jump travels higher than tapping", () => {
    const heights = [true, false].map((hold) => {
      const p = createPlayer();
      p.y = 366;
      p.grounded = true;
      p.buffer = 0.13;
      let top = p.y;
      for (let i = 0; i < 45; i++) {
        stepPlayer(p, { ...none, jump: hold || i === 0 }, makeLevel(0), STEP);
        top = Math.min(top, p.y);
      }
      return top;
    });
    expect(heights[0]).toBeLessThan(heights[1] - 50);
  });
  it("does not let held jump repeat automatically", () => {
    const p = createPlayer();
    p.y = 366;
    p.grounded = true;
    p.buffer = 0.13;
    let jumps = 0;
    for (let i = 0; i < 180; i++)
      jumps += Number(
        stepPlayer(p, { ...none, jump: true }, makeLevel(0), STEP),
      );
    expect(jumps).toBe(1);
  });
  it("all gaps can be crossed with a held jump", () => {
    for (let id = 0; id < 9; id++) {
      const level = makeLevel(id);
      for (let i = 0; i < level.grounds.length - 1; i++) {
        const [gx, gw] = level.grounds[i],
          next = level.grounds[i + 1][0],
          p = createPlayer();
        p.x = gx + gw - 65;
        p.y = 366;
        p.grounded = true;
        p.vx = 270;
        p.buffer = 0.13;
        let landed = false;
        for (let j = 0; j < 100; j++) {
          stepPlayer(p, { ...none, right: true, jump: true }, level, STEP);
          if (p.x >= next && p.grounded) {
            landed = true;
            break;
          }
        }
        expect(landed, `stage ${id}, gap ${i}`).toBe(true);
      }
    }
  });
});
