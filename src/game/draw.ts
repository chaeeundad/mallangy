import { COLORS, WORLDS, type Hero, type Level } from "../data";
import type { Player } from "./physics";
export function round(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
export function star(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = "#f4c76a",
) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      k = i % 2 ? r * 0.47 : r;
    c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
export function hero(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  h: Hero,
  t = 0,
  air = false,
  facing = 1,
) {
  c.save();
  c.translate(x, y);
  c.scale((size / 60) * facing, size / 60);
  const custom = h.customization;
  const color = custom?.bodyColor || COLORS[h.baseColorIndex] || COLORS[1];
  c.save();
  c.translate(0, 27);
  c.scale(1, 0.2);
  c.beginPath();
  c.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
  c.fillStyle = "#66537b18";
  c.fill();
  c.restore();
  c.translate(0, Math.sin(t * 2) * 1.5);
  c.scale(air ? 0.92 : 1.04, air ? 1.08 : 0.96);
  c.fillStyle = color;
  if (h.shapeIndex === 4) {
    for (const d of [-1, 1]) {
      c.beginPath();
      c.ellipse(d * 12, -28, 8, 23, d * 0.12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ef9ab0";
      c.beginPath();
      c.ellipse(d * 12, -30, 3, 13, d * 0.12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = color;
    }
  }
  if ([3, 5].includes(h.shapeIndex)) {
    for (const d of [-1, 1]) {
      c.beginPath();
      c.ellipse(d * 20, -20, 10, 12, d * 0.3, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (h.shapeIndex === 6) {
    for (const d of [-1, 1]) {
      c.beginPath();
      c.arc(d * 16, -23, 11, 0, Math.PI * 2);
      c.fill();
    }
  }
  const g = c.createRadialGradient(-10, -15, 0, 0, 0, 40);
  g.addColorStop(0, "#fff5f0");
  g.addColorStop(0.33, color);
  g.addColorStop(1, color);
  c.fillStyle = g;
  c.globalAlpha = h.slangi ? 0.82 : 1;
  if (h.shapeIndex === 2) star(c, 0, 0, 32, color);
  else {
    c.beginPath();
    c.moveTo(-28, 10);
    c.bezierCurveTo(-34, -37, 34, -37, 28, 10);
    c.bezierCurveTo(29, 31, 11, 28, 0, 26);
    c.bezierCurveTo(-14, 29, -29, 28, -28, 10);
    c.fill();
  }
  c.globalAlpha = 1;
  // Replay workshop paint and stickers onto the adventure friend's front surface.
  c.save();
  c.beginPath();
  c.ellipse(0, 0, 26, 25, 0, 0, Math.PI * 2);
  c.clip();
  if (custom && custom.pattern !== "plain") {
    c.fillStyle = custom.patternColor;
    c.globalAlpha = 0.55;
    if (custom.pattern === "stripes")
      for (let y = -30; y < 30; y += 9) c.fillRect(-30, y, 60, 3);
    if (custom.pattern === "dots")
      for (let y = -30; y < 30; y += 12)
        for (let x = -26; x < 30; x += 12) {
          c.beginPath();
          c.arc(x, y, 2.3, 0, Math.PI * 2);
          c.fill();
        }
    if (custom.pattern === "gradient") {
      const gradient = c.createLinearGradient(0, 25, 0, -25);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, custom.patternColor);
      c.globalAlpha = 0.8;
      c.fillStyle = gradient;
      c.fillRect(-30, -30, 60, 60);
    }
  }
  for (const dab of h.paint.filter((_, i) => i % 3 === 0)) {
    if (dab.z < 0) continue;
    c.fillStyle = dab.color;
    c.globalAlpha = 0.26;
    c.beginPath();
    c.arc(dab.x * 18, -dab.y * 18, (dab.radius ?? 0.42) * 12, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  c.fillStyle = "#fff8";
  c.beginPath();
  c.ellipse(-12, -15, 7, 3, -0.5, 0, Math.PI * 2);
  c.fill();
  if (h.shapeIndex === 1 || h.shapeIndex === 8) {
    c.fillStyle = "#80ac68";
    c.beginPath();
    c.ellipse(4, -27, 10, 4, -0.5, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.translate((custom?.faceX ?? 0) * 18, -(custom?.faceY ?? 0) * 18);
  c.scale(custom?.faceScale ?? 1, custom?.faceScale ?? 1);
  c.fillStyle = custom?.eyeColor ?? "#523e4e";
  for (const d of [-1, 1]) {
    if (h.faceIndex === 2) {
      c.strokeStyle = custom?.eyeColor ?? "#523e4e";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(d * 9 * (custom?.eyeSpacing ?? 1), -2, 3, 0, Math.PI);
      c.stroke();
    } else {
      c.beginPath();
      c.ellipse(
        d * 9 * (custom?.eyeSpacing ?? 1),
        -2,
        2.4,
        3.4,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(d * 9 * (custom?.eyeSpacing ?? 1) - 0.6, -3, 1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = custom?.eyeColor ?? "#523e4e";
    }
  }
  c.globalAlpha = custom?.cheekOpacity ?? 0.52;
  c.fillStyle = "#ec86a7";
  for (const d of [-1, 1]) {
    c.beginPath();
    c.ellipse(d * 17, 6, 5, 2.5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = "#77505a";
  c.lineWidth = 2;
  c.lineCap = "round";
  c.beginPath();
  c.arc(0, 5, h.faceIndex === 1 ? 6 : 4, 0.1, Math.PI - 0.1);
  c.stroke();
  if (h.shapeIndex === 7) {
    c.fillStyle = "#f4b65f";
    c.beginPath();
    c.ellipse(0, 7, 8, 4, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  c.font = "15px sans-serif";
  c.textAlign = "center";
  for (const s of h.stickers.slice(0, 60)) {
    if (s.z >= 0) {
      c.save();
      c.translate(s.x * 19, -s.y * 19 + 5);
      c.rotate((-(s.rotation ?? 0) * Math.PI) / 180);
      c.scale(s.scale ?? 1, s.scale ?? 1);
      c.fillText(s.emoji, 0, 0);
      c.restore();
    }
  }
  c.restore();
}
function cloud(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = "#fff9";
  c.beginPath();
  c.arc(0, 7, 17, 0, Math.PI * 2);
  c.arc(23, -2, 26, 0, Math.PI * 2);
  c.arc(48, 9, 19, 0, Math.PI * 2);
  c.rect(0, 7, 48, 19);
  c.fill();
  c.restore();
}
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};
export function drawWorld(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: Level,
  cam: number,
  t: number,
  p: Player,
  friend: Hero,
  collected: Set<string>,
  particles: Particle[],
  reduced = false,
) {
  const world = WORLDS[level.world],
    sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, world.sky[0]);
  sky.addColorStop(1, world.sky[1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  c.fillStyle = level.world === 2 ? "#fff5d1" : "#fff0b9";
  c.beginPath();
  c.arc(w * 0.8, 77, 32, 0, Math.PI * 2);
  c.fill();
  if (level.world === 2) {
    for (let i = 0; i < 24; i++)
      star(
        c,
        (i * 137 + 50) % w,
        25 + ((i * 71) % 200),
        2 + (i % 2),
        "#ffffffaa",
      );
  }
  for (let i = 0; i < 7; i++)
    cloud(
      c,
      ((((i * 230 - cam * 0.15) % (w + 250)) + w + 250) % (w + 250)) - 80,
      60 + (i % 3) * 38,
      0.55 + (i % 2) * 0.2,
    );
  for (let layer = 0; layer < 2; layer++) {
    c.fillStyle =
      level.world === 0
        ? ["#b8d5bb", "#a9c9a6"][layer]
        : level.world === 1
          ? ["#d0bccf", "#b5c4b4"][layer]
          : ["#c5bfdd", "#b5afd3"][layer];
    c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20)
      c.lineTo(
        x,
        320 +
          layer * 35 -
          Math.sin((x + cam * (0.15 + layer * 0.15)) / 170) * 35 -
          Math.cos(x / 270) * 25,
      );
    c.lineTo(w, h);
    c.fill();
  }
  c.globalAlpha = 1;
  c.save();
  c.translate(-cam, 0);
  for (const [x, width] of level.grounds) {
    c.fillStyle = world.soil;
    round(c, x, 410, width, 110, 16);
    c.fill();
    c.fillStyle = world.ground;
    round(c, x, 402, width, 24, 10);
    c.fill();
    c.fillStyle = "#ffffff38";
    for (let k = x + 25; k < x + width; k += 58) {
      round(c, k, 411, 17, 4, 2);
      c.fill();
    }
    c.fillStyle = "#a58a7020";
    for (let k = x + 20; k < x + width; k += 48) {
      round(c, k, 450 + (k % 3) * 7, 10, 4, 2);
      c.fill();
    }
  }
  for (const [x, width, lift] of level.platforms) {
    const y = 410 - lift;
    c.fillStyle = "#7b64881b";
    round(c, x + 4, y + 6, width, 20, 9);
    c.fill();
    c.fillStyle = level.world === 2 ? "#f8f5ff" : world.accent;
    round(c, x, y, width, 21, 9);
    c.fill();
    c.fillStyle = "#ffffff66";
    round(c, x + 6, y + 3, width - 12, 5, 3);
    c.fill();
  }
  for (let x = 35; x < level.width; x += 115) {
    if (
      x < cam - 80 ||
      x > cam + w + 80 ||
      !level.grounds.some(([gx, gw]) => x > gx + 10 && x < gx + gw - 10)
    )
      continue;
    const y = 403;
    c.strokeStyle = "#789e74";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x - 1, y - 10, x + 2, y - 14);
    c.stroke();
    c.fillStyle =
      level.world === 1 ? "#e8a1bb" : level.world === 2 ? "#ddd0f5" : "#f8edb4";
    for (let j = 0; j < 5; j++) {
      c.beginPath();
      c.ellipse(
        x + 2 + Math.cos(j * 1.26) * 4,
        y - 15 + Math.sin(j * 1.26) * 4,
        3.3,
        3.3,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.fillStyle = "#e9bb76";
    c.beginPath();
    c.arc(x + 2, y - 15, 2, 0, Math.PI * 2);
    c.fill();
  }
  if (level.world === 1) {
    for (let x = 100; x < level.width; x += 520) {
      if (x < cam - 100 || x > cam + w + 100) continue;
      c.fillStyle = "#9bb99d";
      c.beginPath();
      c.ellipse(x, 350, 28, 45, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#eaa2b3";
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(
          x - 12 + (i % 2) * 23,
          340 + Math.floor(i / 2) * 23,
          7,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    }
  }
  for (const x of level.checkpoints) {
    c.strokeStyle = "#a2958b";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 30, 410);
    c.lineTo(x + 30, 355);
    c.stroke();
    c.fillStyle = p.x > x ? world.ink : "#fff8";
    c.beginPath();
    c.moveTo(x + 30, 355);
    c.lineTo(x + 56, 363);
    c.lineTo(x + 30, 374);
    c.fill();
  }
  const bob = reduced ? 0 : Math.sin(t * 3) * 3;
  level.stars.forEach(([x, lift], i) => {
    if (collected.has("s" + i)) return;
    const y = 410 - lift + bob;
    c.fillStyle = "#ffffff66";
    c.beginPath();
    c.arc(x, y, 19, 0, Math.PI * 2);
    c.fill();
    star(c, x, y, 12);
    star(c, x - 3, y - 3, 3, "#fff7d5");
  });
  level.berries.forEach(([x, lift], i) => {
    if (collected.has("b" + i)) return;
    c.save();
    c.translate(x, 410 - lift + bob);
    c.fillStyle = "#db819b";
    c.beginPath();
    c.moveTo(0, 13);
    c.bezierCurveTo(-25, -9, -9, -19, 0, -10);
    c.bezierCurveTo(10, -19, 23, -9, 0, 13);
    c.fill();
    c.fillStyle = "#8bac7e";
    c.beginPath();
    c.ellipse(0, -13, 10, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffedbc";
    for (const d of [-1, 1]) {
      c.beginPath();
      c.arc(d * 5, -2, 1.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
  const goal = level.goal;
  c.fillStyle = "#d1bc9f";
  round(c, goal - 24, 330, 66, 80, 12);
  c.fill();
  c.fillStyle = world.accent;
  c.beginPath();
  c.moveTo(goal - 34, 336);
  c.lineTo(goal + 8, 297);
  c.lineTo(goal + 52, 336);
  c.fill();
  c.fillStyle = "#fff2cc";
  round(c, goal - 3, 369, 23, 41, 12);
  c.fill();
  star(c, goal + 8, 347, 8, "#fff7d7");
  hero(c, p.x + p.w / 2, p.y + p.h / 2, 52, friend, t, !p.grounded, p.facing);
  for (const a of particles) {
    c.globalAlpha = Math.max(0, a.life);
    star(c, a.x, a.y, 4, a.color);
  }
  c.globalAlpha = 1;
  c.restore();
}
