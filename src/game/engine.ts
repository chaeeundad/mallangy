import { makeLevel, type Hero, type Level } from "../data";
import { chime } from "../audio";
import { save } from "../storage";
import {
  createPlayer,
  stepPlayer,
  STEP,
  type Player,
  type Input,
} from "./physics";
import { drawWorld, type Particle } from "./draw";
export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  level: Level;
  player: Player = createPlayer();
  input: Input = { left: false, right: false, jump: false };
  collected = new Set<string>();
  particles: Particle[] = [];
  running = false;
  elapsed = 0;
  checkpoint = 45;
  camera = 0;
  raf = 0;
  last = 0;
  acc = 0;
  w = 960;
  h = 480;
  onFinish: (stars: number, berries: number, time: number) => void;
  onScore: (stars: number, berries: number) => void;
  onPause: () => void;
  friend: Hero;
  abort = new AbortController();
  observer: ResizeObserver;
  constructor(
    canvas: HTMLCanvasElement,
    id: number,
    friend: Hero,
    callbacks: {
      finish: Game["onFinish"];
      score: Game["onScore"];
      pause: Game["onPause"];
    },
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = makeLevel(id);
    this.friend = structuredClone(friend);
    this.onFinish = callbacks.finish;
    this.onScore = callbacks.score;
    this.onPause = callbacks.pause;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    const opts = { signal: this.abort.signal };
    window.addEventListener("keydown", this.keyDown, opts);
    window.addEventListener("keyup", this.keyUp, opts);
    window.addEventListener("blur", this.focusLost, opts);
    document.addEventListener("visibilitychange", this.visibility, opts);
    document
      .querySelectorAll<HTMLButtonElement>("[data-control]")
      .forEach((button) => {
        const key = button.dataset.control as keyof Input;
        button.addEventListener(
          "pointerdown",
          (e) => {
            e.preventDefault();
            button.setPointerCapture(e.pointerId);
            if (this.running) {
              this.input[key] = true;
              if (key === "jump") this.player.buffer = 0.13;
            }
          },
          opts,
        );
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          button.addEventListener(
            type,
            () => {
              this.input[key] = false;
            },
            opts,
          );
      });
    this.render(0);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.h = 480;
    this.w = Math.max(300, (this.h * rect.width) / rect.height);
    this.ctx.setTransform(
      this.canvas.width / this.w,
      0,
      0,
      this.canvas.height / this.h,
      0,
      0,
    );
    this.render(this.elapsed);
  }
  keyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.matches("input,textarea,select")) return;
    const k = e.key.toLowerCase();
    if (
      [
        "arrowleft",
        "arrowright",
        "arrowup",
        " ",
        "a",
        "d",
        "w",
        "escape",
      ].includes(k)
    )
      e.preventDefault();
    if (k === "escape") {
      if (this.running) {
        this.pause();
        this.onPause();
      }
      return;
    }
    if (!this.running) return;
    if (k === "arrowleft" || k === "a") this.input.left = true;
    if (k === "arrowright" || k === "d") this.input.right = true;
    if (["arrowup", " ", "w"].includes(k) && !e.repeat) {
      this.input.jump = true;
      this.player.buffer = 0.13;
    }
  };
  keyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "a"].includes(k)) this.input.left = false;
    if (["arrowright", "d"].includes(k)) this.input.right = false;
    if (["arrowup", " ", "w"].includes(k)) this.input.jump = false;
  };
  focusLost = () => {
    if (this.running) {
      this.pause();
      this.onPause();
    }
  };
  visibility = () => {
    if (document.hidden) this.focusLost();
  };
  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    this.acc = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  pause() {
    this.running = false;
    this.input = { left: false, right: false, jump: false };
    this.player.buffer = 0;
    cancelAnimationFrame(this.raf);
  }
  dispose() {
    this.pause();
    this.abort.abort();
    this.observer.disconnect();
  }
  score() {
    return {
      stars: [...this.collected].filter((x) => x[0] === "s").length,
      berries: [...this.collected].filter((x) => x[0] === "b").length,
    };
  }
  update() {
    this.elapsed += STEP;
    if (stepPlayer(this.player, this.input, this.level, STEP)) chime("jump");
    const p = this.player;
    for (const x of this.level.checkpoints)
      if (p.x > x + 12 && p.grounded && p.y + p.h >= 409)
        this.checkpoint = x + 20;
    for (const [kind, list] of [
      ["s", this.level.stars],
      ["b", this.level.berries],
    ] as const) {
      list.forEach(([x, lift], i) => {
        const key = kind + i;
        if (this.collected.has(key)) return;
        const y = 410 - lift;
        if (
          Math.abs(p.x + p.w / 2 - x) < p.w / 2 + 12 &&
          Math.abs(p.y + p.h / 2 - y) < p.h / 2 + 12
        ) {
          this.collected.add(key);
          chime(kind === "s" ? "star" : "berry");
          if (!save.settings.reducedMotion)
            for (let j = 0; j < 8; j++)
              this.particles.push({
                x,
                y,
                vx: Math.cos(j * 0.79) * 80,
                vy: Math.sin(j * 0.79) * 80,
                life: 1,
                color: kind === "s" ? "#f1c366" : "#e59db1",
              });
          const score = this.score();
          this.onScore(score.stars, score.berries);
        }
      });
    }
    if (p.y > 570) {
      this.player = createPlayer(this.checkpoint);
      this.player.y = 320;
      this.particles = [];
    }
    for (const a of this.particles) {
      a.x += a.vx * STEP;
      a.y += a.vy * STEP;
      a.vy += 100 * STEP;
      a.life -= STEP * 2;
    }
    this.particles = this.particles.filter((a) => a.life > 0);
    this.camera = Math.max(
      0,
      Math.min(this.level.width - this.w, p.x - this.w * 0.35),
    );
    if (p.x >= this.level.goal - 25 && p.grounded) {
      this.pause();
      chime("finish");
      const s = this.score();
      this.onFinish(s.stars, s.berries, this.elapsed);
    }
  }
  render(t: number) {
    drawWorld(
      this.ctx,
      this.w,
      this.h,
      this.level,
      this.camera,
      t,
      this.player,
      this.friend,
      this.collected,
      this.particles,
      save.settings.reducedMotion,
    );
  }
  frame = (now: number) => {
    if (!this.running) return;
    const delta = this.last ? Math.min(0.1, (now - this.last) / 1000) : STEP;
    this.last = now;
    this.acc += delta;
    while (this.acc >= STEP && this.running) {
      this.update();
      this.acc -= STEP;
    }
    this.render(this.elapsed);
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };
}
