import "./fonts.css";
import "./style.css";
import "./mobile.css";
import { mountStorybook } from "./storybook/reader";
import {
  createIcons,
  House,
  Map,
  Palette,
  Heart,
  Settings,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Pause,
  Star,
  Check,
  Lock,
  Download,
  Upload,
  RotateCcw,
  X,
  ChevronRight,
  BookOpen,
  Sparkles,
  Flag,
  Play,
  MoveLeft,
  MoveRight,
  ArrowUp,
  Maximize,
} from "lucide";
import {
  WORLDS,
  STAGE_NAMES,
  makeLevel,
  COLORS,
  SHAPES,
  type Hero,
} from "./data";
import {
  save,
  persist,
  replaceSave,
  unlocked,
  recordLevel,
  normalizeHero,
  normalizeSave,
} from "./storage";
import { Game } from "./game/engine";
import { drawWorld, hero as drawHero } from "./game/draw";
import { createPlayer } from "./game/physics";
import { chime } from "./audio";
const icons = {
  House,
  Map,
  Palette,
  Heart,
  Settings,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Pause,
  Star,
  Check,
  Lock,
  Download,
  Upload,
  RotateCcw,
  X,
  ChevronRight,
  BookOpen,
  Sparkles,
  Flag,
  Play,
  MoveLeft,
  MoveRight,
  ArrowUp,
  Maximize,
};
const icon = (name: string, cls = "") =>
  `<i data-lucide="${name}" class="${cls}"></i>`;
const el = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const esc = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let current = "home",
  game: Game | undefined,
  workshop: any,
  selectedWorld = 0,
  activeLevel = 0;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  el("#toast").textContent = message;
  el("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el("#toast").classList.remove("visible"), 3000);
}
function renderIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.7 } });
}
function totals() {
  return Object.values(save.records).reduce((a, r) => a + r.stars, 0);
}
function nextLevel() {
  for (let i = 0; i < 9; i++) if (!save.records[i]) return i;
  return 8;
}
const mark = `<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M7 34C4 7 52 7 49 34Q51 48 28 45Q5 48 7 34" fill="#ebacbd"/><circle cx="20" cy="28" r="2.2" fill="#554653"/><circle cx="36" cy="28" r="2.2" fill="#554653"/><path d="M24 34Q28 39 32 34" stroke="#554653" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
el("#app").innerHTML = `
<div class="app-shell">
<header class="app-header"><button class="brand" data-screen="home" aria-label="말랑말랑 친구들 홈">${mark}<span>말랑말랑 친구들<small>작은 친구와 커다란 여행</small></span></button><nav class="main-nav" aria-label="주 메뉴"><button data-screen="home">${icon("house")}<span>우리의 집</span></button><button data-screen="map">${icon("map")}<span>모험 지도</span></button><button data-screen="workshop">${icon("palette")}<span>말랑이 작업실</span></button><button data-screen="storybook">${icon("book-open")}<span>말랑이 이야기</span></button><button data-screen="collection">${icon("heart")}<span>친구 수첩</span></button></nav><div class="header-tools"><span class="star-wallet">${icon("star")} <b id="total-stars">${totals()}</b></span><button class="icon-button" id="settings" aria-label="설정">${icon("settings")}</button></div></header>
<main class="app-main">
<section id="home-view" class="view home-view"><div class="home-topline"><span class="eyebrow"><span class="live-dot"></span> 나만의 작은 모험이 시작되는 곳</span><span class="season">THE RAINBOW JOURNEY &nbsp; / &nbsp; 01</span></div><div class="home-hero"><div class="hero-copy"><span class="chapter-label">말랑말랑 친구들 : 무지개를 찾아서</span><h1>조그만 친구와,<br>커다란 <span>모험.</span><svg viewBox="0 0 235 18" aria-hidden="true"><path d="M3 12Q115-7 230 11" fill="none" stroke="#e4ab9e" stroke-width="5" stroke-linecap="round"/></svg></h1><p>내 손으로 만든 말랑이와 함께<br>흩어진 무지개 조각을 찾아 떠나요.<br>조금 느려도 괜찮은, 우리만의 여행.</p><div class="hero-actions"><button class="button primary" id="continue-adventure">모험 떠나기 ${icon("arrow-up-right")}</button><button class="button soft" data-screen="workshop">내 친구 만들기 ${icon("palette")}</button></div><div class="home-save-note">${icon("check")} 이 기기에 여행이 자동으로 기록돼요</div></div><div class="hero-art"><div class="art-tag">A LITTLE WORLD OF YOUR OWN</div><canvas id="home-canvas" aria-label="햇살 초원에 모여 있는 말랑이 친구들"></canvas><div class="art-speech">오늘은 어떤 모험을 할까?</div><div class="art-postcard"><span>FROM. 말랑이 마을</span><b>너와 함께라서 반짝이는 날</b><svg viewBox="0 0 45 45"><path d="M5 31Q22 0 40 31M11 31Q22 10 34 31M17 31Q22 20 28 31" stroke="#b39acb" stroke-width="4" fill="none" stroke-linecap="round"/></svg></div><span class="art-coordinate">35° MALLANG · 127° FRIENDSHIP</span></div></div><div class="journey-intro"><div><span class="eyebrow">YOUR NEXT CHAPTER</span><h2>어디로 떠나볼까요?</h2></div><button class="text-button" data-screen="map">모험 지도 펼치기 ${icon("arrow-right")}</button></div><div class="world-grid" id="home-worlds"></div><button class="home-story-invite" data-screen="storybook"><span class="story-invite-symbol">${icon("book-open")}</span><span><small>말랑이와 작은 빛의 씨앗 · 그림 동화 32쪽</small><b>오늘은, 이야기를 읽어 볼까요?</b><span id="home-story-progress">그림 속 작은 놀이와 함께 천천히 읽어요</span></span><span class="story-invite-arrow">${icon("arrow-up-right")}</span></button><div class="family-note"><span>작은 손에서 시작된 세계</span><p>아이들의 상상으로 태어나, 함께 만들어가는 이야기예요.</p><span class="tiny-spark">✧</span></div></section>
<section id="storybook-view" class="view storybook-view" hidden></section><section id="map-view" class="view" hidden></section>
<section id="workshop-view" class="view" hidden><div class="page-heading"><div><span class="eyebrow">MADE BY YOU</span><h1>말랑이 작업실</h1><p>세상에 하나뿐인 친구. 오늘의 주인공은 네가 만드는 거야.</p></div><button class="button primary" id="workshop-adventure">이 친구와 모험 ${icon("arrow-right")}</button></div><div class="workshop-root" id="workshop-root"></div></section>
<section id="collection-view" class="view" hidden></section>
<section id="game-view" class="view game-view" hidden><div class="game-topline"><button class="text-button" id="game-back">${icon("arrow-left")} 모험 지도</button><span id="game-title"></span><button class="icon-button" id="fullscreen" aria-label="전체 화면">${icon("maximize")}</button></div><div class="game-frame" id="game-frame"><canvas id="game-canvas" aria-label="말랑이 모험 게임. 방향키로 이동하고 스페이스로 점프하세요." tabindex="0"></canvas><div class="game-hud"><div class="hud-name"><span id="game-world"></span><b id="game-hero"></b></div><div class="hud-right"><div class="hud-score">${icon("star")} <b id="game-stars">0</b><span>/ 10</span><span class="berry">🍓 <b id="game-berries">0</b><span>/ 3</span></span></div><button class="icon-button" id="game-pause" aria-label="일시정지">${icon("pause")}</button></div></div><div class="story-overlay" id="story-overlay" hidden></div><div class="mobile-game-deck"><div class="deck-caption"><span>${icon("sparkles")} 한 걸음씩, 우리만의 속도로</span><button class="text-button" id="mobile-game-help" aria-label="모바일 조작 안내">${icon("book-open")} 놀이 방법</button></div></div><div class="touch-controls-new"><div><button data-control="left" aria-label="왼쪽으로 이동">${icon("move-left")}</button><button data-control="right" aria-label="오른쪽으로 이동">${icon("move-right")}</button></div><button data-control="jump" class="jump-control" aria-label="점프">${icon("arrow-up")}<span>점프</span></button></div></div><div class="game-bottom"><span>${icon("heart")} 떨어져도 괜찮아. 가까운 깃발에서 다시 시작해.</span><span><kbd>←</kbd><kbd>→</kbd> 이동 <kbd>Space</kbd> 점프 <kbd>Esc</kbd> 쉬어가기</span></div></section>
</main><nav class="mobile-nav" aria-label="모바일 주 메뉴"><button data-screen="home" aria-label="우리의 집">${icon("house")}<span>우리집</span><i class="nav-dot"></i></button><button data-screen="map" aria-label="모험 지도">${icon("map")}<span>모험 지도</span><i class="nav-dot"></i></button><button data-screen="workshop" aria-label="말랑이 작업실">${icon("palette")}<span>만들기</span><i class="nav-dot"></i></button><button data-screen="storybook" aria-label="말랑이 이야기">${icon("book-open")}<span>이야기</span><i class="nav-dot"></i></button><button data-screen="collection" aria-label="친구 수첩">${icon("heart")}<span>친구 수첩</span><i class="nav-dot"></i></button></nav><footer class="app-footer"><span>© 말랑말랑 친구들</span><span>작은 상상들이 모여, 하나의 세계가 돼요. <span class="footer-star">✦</span></span><button class="text-button" id="how-to">놀이 안내 ${icon("book-open")}</button></footer></div><dialog id="dialog" class="modal"></dialog><input type="file" accept="application/json,.json" id="import-file" hidden>`;
const storybook = mountStorybook(el("#storybook-view"));
function cardArt(world: number) {
  return `<div class="world-art art-${world}" aria-hidden="true"><span class="sun"></span><span class="cloud c1"></span><span class="cloud c2"></span><span class="hill h1"></span><span class="hill h2"></span><span class="island"></span><span class="little-friend f-${world}"><i></i><i></i><b>⌣</b></span><span class="plant p1">${world === 1 ? "🍓" : world === 2 ? "✦" : "✿"}</span><span class="plant p2">${world === 1 ? "✿" : world === 2 ? "✧" : "✿"}</span><span class="mini-star">✧</span></div>`;
}
function worldCard(i: number) {
  const world = WORLDS[i],
    count = [0, 1, 2].filter((s) => save.records[i * 3 + s]).length;
  return `<button class="world-card" data-world="${i}">${cardArt(i)}<div class="world-card-info"><div><span class="world-number">CHAPTER 0${i + 1} <span>·</span> ${count}/3 여행</span><h3>${world.name}</h3><p>${world.subtitle}</p></div><span class="round-arrow">${icon("arrow-up-right")}</span></div></button>`;
}
function updateHome() {
  el("#home-worlds").innerHTML = WORLDS.map((_, i) => worldCard(i)).join("");
  el("#total-stars").textContent = String(totals());
  el("#continue-adventure").innerHTML =
    `${Object.keys(save.records).length ? "이어서 여행하기" : "모험 떠나기"} ${icon("arrow-up-right")}`;
  el("#home-story-progress").textContent = save.storybook.finished
    ? "다 읽은 이야기도, 다시 펼치면 새로운 마음이 보여요"
    : save.storybook.page > 0
      ? `${save.storybook.page + 1}쪽에 책갈피를 꽂아 두었어요`
      : "그림 속 작은 놀이와 함께 천천히 읽어요";
  renderIcons();
  drawHome();
}
function drawHome() {
  const canvas = el<HTMLCanvasElement>("#home-canvas");
  const c = canvas.getContext("2d")!;
  canvas.width = 1200;
  canvas.height = 1000;
  c.scale(2, 2);
  const w = 600,
    h = 500;
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#e9e9e0");
  grad.addColorStop(1, "#e9efdf");
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  // A miniature world, drawn locally so the game has no image service dependency.
  c.strokeStyle = "#e7b6ad";
  c.lineWidth = 17;
  c.beginPath();
  c.arc(330, 227, 143, Math.PI, Math.PI * 2);
  c.stroke();
  c.strokeStyle = "#e7d3a1";
  c.beginPath();
  c.arc(330, 227, 124, Math.PI, Math.PI * 2);
  c.stroke();
  c.strokeStyle = "#bdcfb6";
  c.beginPath();
  c.arc(330, 227, 105, Math.PI, Math.PI * 2);
  c.stroke();
  for (const [x, y, s] of [
    [80, 125, 0.8],
    [455, 165, 0.8],
    [425, 75, 0.6],
  ]) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = "#fff9";
    c.beginPath();
    c.arc(0, 0, 18, 0, 7);
    c.arc(25, -10, 25, 0, 7);
    c.arc(51, 1, 20, 0, 7);
    c.rect(0, 0, 50, 20);
    c.fill();
    c.restore();
  }
  c.fillStyle = "#c6d8be";
  c.beginPath();
  c.ellipse(300, 361, 240, 53, 0, 0, 7);
  c.fill();
  c.fillStyle = "#d8c8a7";
  c.beginPath();
  c.moveTo(60, 351);
  c.bezierCurveTo(75, 465, 520, 470, 540, 351);
  c.fill();
  c.fillStyle = "#b6cfa8";
  c.beginPath();
  c.ellipse(300, 344, 240, 63, 0, 0, 7);
  c.fill();
  c.fillStyle = "#d1dfbc";
  c.beginPath();
  c.ellipse(300, 328, 226, 55, 0, 0, 7);
  c.fill();
  for (let i = 0; i < 19; i++) {
    const x = 95 + i * 23,
      y = 330 + Math.sin(i * 7) * 28;
    c.fillStyle = i % 3 ? "#fcf2cf" : "#dfa9b9";
    c.beginPath();
    c.arc(x, y, 3.3, 0, 7);
    c.fill();
  }
  c.fillStyle = "#a0ba91";
  for (const [x, y] of [
    [105, 290],
    [480, 280],
  ]) {
    c.fillRect(x - 3, y, 6, 55);
    c.beginPath();
    c.ellipse(x, y - 5, 28, 40, 0, 0, 7);
    c.fill();
    c.fillStyle = "#bad0a4";
    c.beginPath();
    c.ellipse(x - 13, y + 10, 21, 24, 0, 0, 7);
    c.fill();
    c.fillStyle = "#a0ba91";
  }
  drawHero(c, 203, 311, 105, {
    ...save.hero,
    shapeIndex: 4,
    baseColorIndex: 11,
  });
  drawHero(c, 326, 292, 145, save.hero);
  drawHero(c, 421, 325, 81, { ...save.hero, shapeIndex: 2, baseColorIndex: 4 });
  c.font = "22px serif";
  c.fillStyle = "#c1a0ba";
  c.fillText("✦", 170, 200);
  c.fillText("✧", 460, 238);
  c.font = "15px serif";
  c.fillText("✧", 120, 225);
}
function renderMap() {
  const world = WORLDS[selectedWorld];
  el("#map-view").innerHTML =
    `<div class="page-heading"><div><span class="eyebrow">ONE STEP, ONE LITTLE STORY</span><h1>우리의 모험 지도</h1><p>세 개의 세계, 아홉 개의 이야기. 마음 가는 속도로 걸어가요.</p></div><span class="progress-pill">${icon("flag")} ${Object.keys(save.records).length} / 9 여행 완료</span></div><div class="world-tabs" role="tablist" aria-label="여행 지역">${WORLDS.map((w, i) => `<button role="tab" aria-selected="${i === selectedWorld}" data-world-tab="${i}"><span>0${i + 1}</span> ${w.name} ${save.records[i * 3 + 2] ? icon("check") : ""}</button>`).join("")}</div><div class="map-panel" style="--world-color:${world.color};--world-ink:${world.ink}"><div class="map-illustration">${cardArt(selectedWorld)}<div><span class="eyebrow">CHAPTER 0${selectedWorld + 1}</span><h2>${world.name}</h2><p>${world.subtitle}</p><span class="map-friend">${world.emoji} ${world.friend}의 이야기</span></div></div><div class="stage-list">${[
      0, 1, 2,
    ]
      .map((s) => {
        const id = selectedWorld * 3 + s,
          r = save.records[id],
          open = unlocked(id);
        return `<button class="stage-card ${!open ? "locked" : ""}" data-level="${id}" ${!open ? "disabled" : ""}><span class="stage-number">${r ? icon("check") : open ? `0${s + 1}` : icon("lock")}</span><span class="stage-description"><small>STAGE ${selectedWorld + 1}–${s + 1}</small><b>${STAGE_NAMES[id]}</b><span>${r ? `별 ${r.stars}/10 · 딸기 ${r.berries}/3 · ${formatTime(r.time)}` : open ? "새로운 이야기가 기다리고 있어요" : "이전 여행을 마치면 열려요"}</span></span><span class="stage-right">${r ? starRating(r.stars) : open ? "떠나기" : ""} ${open ? icon("arrow-right") : ""}</span></button>`;
      })
      .join(
        "",
      )}</div></div><div class="map-note">${icon("sparkles")} 별을 모두 모으지 않아도 다음 이야기로 갈 수 있어요. 놓친 별은 언제든 다시 찾으러 와요.</div>`;
  renderIcons();
}
function starRating(stars: number) {
  return `<span class="rating" aria-label="별 ${stars}개">${[3, 6, 10].map((n) => icon("star", stars >= n ? "earned" : "")).join("")}</span>`;
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
async function show(screen: string) {
  if (current === "game" && screen !== "game") {
    game?.dispose();
    game = undefined;
  }
  if (current === "workshop" && workshop) workshop.setActive(false);
  storybook.setActive(screen === "storybook");
  current = screen;
  document.body.dataset.screen = screen;
  document
    .querySelectorAll<HTMLElement>(".view")
    .forEach((v) => (v.hidden = v.id !== screen + "-view"));
  document
    .querySelectorAll<HTMLButtonElement>(".main-nav button, .mobile-nav button")
    .forEach((b) => {
      b.classList.toggle("active", b.dataset.screen === screen);
      b.setAttribute(
        "aria-current",
        b.dataset.screen === screen ? "page" : "false",
      );
    });
  if (screen === "home") updateHome();
  if (screen === "map") renderMap();
  if (screen === "collection") renderCollection();
  if (screen === "workshop") {
    if (!workshop) {
      el("#workshop-root").innerHTML =
        '<p class="loading-note">작은 상상 작업실을 여는 중…</p>';
      try {
        const [{ workshopTemplate }, { mountWorkshop }] = await Promise.all([
          import("./workshop/template"),
          import("./workshop/workshop.js"),
        ]);
        el("#workshop-root").innerHTML = workshopTemplate;
        workshop = mountWorkshop();
        setupMobileWorkshop();
        el("#redo-workshop").onclick = () =>
          toast(
            workshop.redo() ? "다시 적용했어요." : "다시 적용할 작업이 없어요.",
          );
        el("#undo-workshop").onclick = () =>
          toast(
            workshop.undo()
              ? "한 단계 되돌렸어요."
              : "아직 되돌릴 것이 없어요.",
          );
      } catch {
        el("#workshop-root").innerHTML =
          '<div class="empty-state"><h2>작업실을 열 수 없어요</h2><p>브라우저의 그래픽 가속을 켜거나 최신 브라우저에서 다시 열어 주세요. 저장한 친구로 모험은 계속할 수 있어요.</p></div>';
      }
    } else workshop.setActive(true);
  }
  window.scrollTo({ top: 0, behavior: "instant" });
  renderIcons();
}
function setupMobileWorkshop() {
  const root = el("#workshop-root");
  root.dataset.mobilePanel = "shape";
  const selectPanel = (panel: string) => {
    root.dataset.mobilePanel = panel;
    root
      .querySelectorAll<HTMLButtonElement>("[data-workshop-tab]")
      .forEach((button) => {
        const selected = button.dataset.workshopTab === panel;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
    el("#workshop-root aside").scrollTop = 0;
  };
  root
    .querySelectorAll<HTMLButtonElement>("[data-workshop-tab]")
    .forEach((button, i, buttons) => {
      button.onclick = () => selectPanel(button.dataset.workshopTab!);
      button.onkeydown = (e) => {
        let next = i;
        if (e.key === "ArrowRight") next = (i + 1) % buttons.length;
        else if (e.key === "ArrowLeft")
          next = (i - 1 + buttons.length) % buttons.length;
        else return;
        e.preventDefault();
        selectPanel(buttons[next].dataset.workshopTab!);
        buttons[next].focus();
      };
    });
  root.querySelectorAll<HTMLButtonElement>("[data-mobile-tool]").forEach(
    (button) =>
      (button.onclick = () => {
        const tool = button.dataset.mobileTool!;
        root.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`)!.click();
        if (tool === "paint" || tool === "sticker") selectPanel("decorate");
        syncTools(tool);
      }),
  );
  const syncTools = (tool: string) =>
    root
      .querySelectorAll("[data-mobile-tool]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String((button as HTMLElement).dataset.mobileTool === tool),
        ),
      );
  root
    .querySelectorAll<HTMLButtonElement>("[data-tool]")
    .forEach((button) =>
      button.addEventListener("click", () => syncTools(button.dataset.tool!)),
    );
  root
    .querySelectorAll<HTMLButtonElement>("[data-s]")
    .forEach((button) =>
      button.addEventListener("click", () => syncTools("sticker")),
    );
}
function renderCollection() {
  const count = Object.keys(save.records).length;
  const badges = [
    {
      name: "첫 발걸음",
      desc: "첫 여행을 마치기",
      yes: !!save.records[0],
      emoji: "🌱",
    },
    {
      name: "무지개 친구",
      desc: "세 세계의 이야기를 완성하기",
      yes: count === 9,
      emoji: "🌈",
    },
    {
      name: "반짝별 수집가",
      desc: "반짝별 60개 모으기",
      yes: totals() >= 60,
      emoji: "⭐",
    },
    {
      name: "딸기 소풍",
      desc: "딸기 15개 모으기",
      yes: Object.values(save.records).reduce((a, r) => a + r.berries, 0) >= 15,
      emoji: "🍓",
    },
  ];
  el("#collection-view").innerHTML =
    `<div class="page-heading"><div><span class="eyebrow">LITTLE THINGS TO KEEP</span><h1>우리들의 친구 수첩</h1><p>함께한 순간과 네가 만든 친구들을 소중히 모았어요.</p></div><button class="button soft" id="export-collection">${icon("download")} 여행 백업</button></div><div class="collection-summary"><div><b>${totals()}<small> / 90</small></b><span>모은 반짝별</span></div><div><b>${count}<small> / 9</small></b><span>완성한 이야기</span></div><div><b>${save.gallery.length}</b><span>내가 만든 친구</span></div></div><h2 class="section-heading">작은 여행의 기념 배지</h2><div class="badge-grid">${badges.map((b) => `<div class="badge-card ${b.yes ? "achieved" : ""}"><span>${b.emoji}</span><b>${b.name}</b><p>${b.desc}</p><small>${b.yes ? "획득했어요 ✓" : "아직 여행 중이에요"}</small></div>`).join("")}</div><div class="section-heading-row"><h2 class="section-heading">내가 만든 친구들</h2><button class="text-button" data-screen="workshop">새 친구 만들기 ${icon("arrow-right")}</button></div><div class="friend-grid">${save.gallery.length ? save.gallery.map((h, i) => `<article class="friend-card"><canvas data-friend="${i}" width="260" height="220" aria-label="${esc(h.name)}"></canvas><h3>${esc(h.name || "이름 없는 친구")}</h3><p>${SHAPES[h.shapeIndex]} · ${h.slangi ? "쫀득한 슬랑이" : "포근한 말랑이"}</p><div><button class="text-button" data-load-friend="${i}">함께 놀기 ${icon("arrow-right")}</button><button class="icon-button small" data-delete-friend="${i}" aria-label="${esc(h.name)} 삭제">${icon("x")}</button></div></article>`).join("") : `<div class="empty-state"><span>✧</span><h3>첫 번째 친구를 기다리고 있어요</h3><p>작업실에서 친구를 만들고 ‘내 말랑이 저장’을 눌러 주세요.</p><button class="button soft" data-screen="workshop">작업실 가기 ${icon("arrow-right")}</button></div>`}</div>`;
  document
    .querySelectorAll<HTMLCanvasElement>("[data-friend]")
    .forEach((c) =>
      drawHero(
        c.getContext("2d")!,
        130,
        115,
        125,
        save.gallery[Number(c.dataset.friend)],
      ),
    );
  renderIcons();
}
function dialog(content: string) {
  const d = el<HTMLDialogElement>("#dialog");
  d.innerHTML = `<button class="icon-button modal-close" aria-label="닫기" id="modal-close">${icon("x")}</button>${content}`;
  if (!d.open) d.showModal();
  el("#modal-close").onclick = () => d.close();
  renderIcons();
  return d;
}
function settings() {
  const d = dialog(
    `<span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>편안하게 놀아요</h2><p>우리의 여행이 더 편안해지는 작은 설정.</p><label class="setting-row"><span>${icon("volume-2")} 효과음</span><input type="checkbox" id="sound-setting" ${save.settings.sound ? "checked" : ""}></label><label class="setting-row"><span>${icon("sparkles")} 움직임 줄이기</span><input type="checkbox" id="motion-setting" ${save.settings.reducedMotion ? "checked" : ""}></label><div class="settings-divider"></div><h3>여행 기록 보관하기</h3><p class="small-copy">친구와 진행도는 이 브라우저에 저장돼요. 기기를 바꾸기 전에는 파일로 보관해 주세요.</p><div class="modal-actions"><button class="button soft" id="export-save">${icon("download")} 파일로 보관</button><button class="button soft" id="import-save">${icon("upload")} 불러오기</button></div>`,
  );
  el<HTMLInputElement>("#sound-setting").onchange = (e) => {
    save.settings.sound = (e.target as HTMLInputElement).checked;
    persist();
    if (workshop) workshop.setActive(current === "workshop");
    chime("tap");
  };
  el<HTMLInputElement>("#motion-setting").onchange = (e) => {
    save.settings.reducedMotion = (e.target as HTMLInputElement).checked;
    persist();
    document.body.classList.toggle(
      "reduced-motion",
      save.settings.reducedMotion,
    );
  };
  el("#export-save").onclick = exportSave;
  el("#import-save").onclick = () => {
    d.close();
    el<HTMLInputElement>("#import-file").click();
  };
}
function exportSave() {
  if (workshop && current === "workshop")
    save.hero = normalizeHero(workshop.snapshot());
  persist();
  const blob = new Blob([JSON.stringify(save, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `말랑이-여행-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("우리의 여행을 파일로 보관했어요.");
}
el<HTMLInputElement>("#import-file").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = "";
  if (!file) return;
  if (file.size > 3_000_000) {
    toast("저장 파일은 3MB 이하여야 해요.");
    return;
  }
  try {
    const value = normalizeSave(JSON.parse(await file.text()));
    const d = dialog(
      `<h2>이 여행을 불러올까요?</h2><p>친구 ${value.gallery.length}명과 여행 ${Object.keys(value.records).length}개의 기록으로 현재 기록을 바꿔요. 현재 여행도 먼저 보관할 수 있어요.</p><div class="modal-actions"><button class="button soft" id="backup-first">현재 여행 보관</button><button class="button primary" id="confirm-import">불러오기</button></div>`,
    );
    el("#backup-first").onclick = exportSave;
    el("#confirm-import").onclick = () => {
      replaceSave(value);
      workshop?.load(save.hero);
      document.body.classList.toggle(
        "reduced-motion",
        save.settings.reducedMotion,
      );
      d.close();
      void show("home");
      toast("친구와 여행 기록을 불러왔어요.");
    };
  } catch {
    toast("파일을 읽을 수 없어요. 말랑이 여행의 저장 파일을 골라 주세요.");
  }
};
function help() {
  dialog(
    `<span class="eyebrow">A SMALL GUIDE</span><h2>우리, 이렇게 놀아요</h2><div class="guide-step"><b>01. 친구를 만들어요</b><p>작업실에서 모양과 색을 고르고, 스티커와 비밀 재료로 꾸며요. 되돌리기로 실수를 고칠 수도 있어요.</p></div><div class="guide-step"><b>02. 나란히 여행해요</b><p>방향키 또는 A·D로 이동하고, Space·↑·W로 점프해요. 버튼을 짧게 누르면 낮게, 길게 누르면 높게 뛰어요. 휴대폰에서는 화면의 버튼을 눌러요.</p></div><div class="guide-step"><b>03. 작은 순간을 모아요</b><p>별 10개, 딸기 3개를 찾아보세요. 모두 모으지 않아도 집에 도착하면 다음 여행이 열려요. 모은 수집품은 떨어져도 그대로예요.</p></div><div class="guide-step"><b>04. 쉬었다 가도 좋아요</b><p>Esc 또는 일시정지 버튼으로 쉬어가요. 다른 화면으로 이동하면 자동으로 멈춰요. 여행 기록은 도착했을 때 저장돼요.</p></div>`,
  );
}
function story(lines: string[], friend: string, onDone: () => void) {
  const overlay = el("#story-overlay");
  let i = 0;
  overlay.hidden = false;
  function draw() {
    overlay.innerHTML = `<div class="story-card"><div class="story-avatar">${WORLDS[Math.floor(activeLevel / 3)].emoji}</div><div class="story-content"><span class="eyebrow">${friend}</span><p>${lines[i]}</p><div class="story-actions"><span>${i + 1} / ${lines.length}</span><button class="text-button" id="skip-story">이야기 건너뛰기</button><button class="button primary" id="next-story">${i === lines.length - 1 ? "좋아, 가 보자!" : "다음 이야기"} ${icon("arrow-right")}</button></div></div></div>`;
    el("#next-story").onclick = () => {
      chime("tap");
      if (++i === lines.length) {
        overlay.hidden = true;
        onDone();
      } else draw();
    };
    el("#skip-story").onclick = () => {
      overlay.hidden = true;
      onDone();
    };
    renderIcons();
    el("#next-story").focus();
  }
  draw();
}
async function play(id: number) {
  if (!unlocked(id)) {
    toast("앞선 여행부터 함께 떠나 봐요.");
    return;
  }
  if (workshop && current === "workshop") {
    save.hero = normalizeHero(workshop.snapshot());
    persist();
  }
  game?.dispose();
  await show("game");
  activeLevel = id;
  const level = makeLevel(id),
    world = WORLDS[level.world];
  el("#game-title").textContent = `${world.name} / ${level.name}`;
  el("#game-world").textContent = `${id + 1}번째 여행 · ${level.name}`;
  el("#game-hero").textContent = save.hero.name || "말랑이";
  el("#game-stars").textContent = "0";
  el("#game-berries").textContent = "0";
  game = new Game(el<HTMLCanvasElement>("#game-canvas"), id, save.hero, {
    score: (s, b) => {
      el("#game-stars").textContent = String(s);
      el("#game-berries").textContent = String(b);
    },
    pause: pauseGame,
    finish: finishLevel,
  });
  story(level.intro, world.friend, () => {
    game?.start();
    el("#game-canvas").focus();
  });
}
function pauseGame() {
  if (!game) return;
  game.pause();
  const d = dialog(
    `<span class="eyebrow">TAKE A LITTLE BREATH</span><h2>잠깐, 쉬었다 갈까요?</h2><p>말랑이도 한숨 돌리는 중이에요.</p><button class="button primary full" id="resume-game">${icon("play")} 계속 여행하기</button><div class="modal-actions"><button class="button soft" id="restart-game">${icon("rotate-ccw")} 처음부터</button><button class="button soft" id="leave-game">${icon("map")} 지도 보기</button></div><p class="small-copy">지도로 돌아가면 이번 코스는 처음부터 시작해요.</p>`,
  );
  const resume = () => {
    game?.start();
    el("#game-canvas").focus();
  };
  el("#resume-game").onclick = () => d.close();
  d.addEventListener("close", resume, { once: true });
  el("#restart-game").onclick = () => {
    d.removeEventListener("close", resume);
    d.close();
    void play(activeLevel);
  };
  el("#leave-game").onclick = () => {
    d.removeEventListener("close", resume);
    d.close();
    selectedWorld = Math.floor(activeLevel / 3);
    void show("map");
  };
}
function finishLevel(stars: number, berries: number, time: number) {
  recordLevel(activeLevel, stars, berries, time);
  el("#total-stars").textContent = String(totals());
  const level = makeLevel(activeLevel),
    world = WORLDS[level.world];
  story(level.outro, world.friend, () => {
    const overlay = el("#story-overlay");
    overlay.hidden = false;
    overlay.innerHTML = `<div class="result-card"><span class="eyebrow">${activeLevel === 8 ? "OUR RAINBOW IS BACK" : "A LITTLE JOURNEY, COMPLETED"}</span><div class="result-rainbow">${activeLevel % 3 === 2 ? "🌈" : "✧"}</div><h2>${activeLevel === 8 ? "우리의 무지개가 돌아왔어!" : "작은 여행을 마쳤어요!"}</h2><p>${esc(save.hero.name || "말랑이")}와 함께한 ${level.name}</p>${starRating(stars)}<div class="result-stats"><span>⭐ ${stars} / 10</span><span>🍓 ${berries} / 3</span><span>${formatTime(time)}</span></div><div class="modal-actions"><button class="button soft" id="result-map">모험 지도</button><button class="button primary" id="result-next">${activeLevel < 8 ? "다음 이야기" : "우리의 수첩"} ${icon("arrow-right")}</button></div><button class="text-button" id="result-retry">${icon("rotate-ccw")} 놓친 별 찾으러 가기</button></div>`;
    el("#result-map").onclick = () => {
      selectedWorld = level.world;
      void show("map");
    };
    el("#result-next").onclick = () =>
      activeLevel < 8 ? void play(activeLevel + 1) : void show("collection");
    el("#result-retry").onclick = () => void play(activeLevel);
    renderIcons();
    el("#result-next").focus();
  });
}
// Delegation keeps navigation and regenerated map/gallery cards in sync.
document.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  if (target.dataset.screen) {
    if (current === "game" && game?.running) {
      game.pause();
      const d = dialog(
        `<h2>여행을 잠깐 멈출까요?</h2><p>이 코스를 떠나면 처음부터 다시 시작해요. 완료한 여행 기록은 그대로 남아요.</p><div class="modal-actions"><button class="button soft" id="nav-stay">계속 여행하기</button><button class="button primary" id="nav-leave">이동하기</button></div>`,
      );
      const resume = () => game?.start();
      d.addEventListener("close", resume, { once: true });
      el("#nav-stay").onclick = () => d.close();
      el("#nav-leave").onclick = () => {
        d.removeEventListener("close", resume);
        d.close();
        void show(target.dataset.screen!);
      };
      return;
    }
    void show(target.dataset.screen);
  }
  if (target.dataset.world !== undefined) {
    selectedWorld = Number(target.dataset.world);
    void show("map");
  }
  if (target.dataset.worldTab !== undefined) {
    selectedWorld = Number(target.dataset.worldTab);
    renderMap();
  }
  if (target.dataset.level !== undefined)
    void play(Number(target.dataset.level));
  if (target.dataset.loadFriend !== undefined) {
    save.hero = structuredClone(
      save.gallery[Number(target.dataset.loadFriend)],
    );
    persist();
    await show("workshop");
    workshop?.load(save.hero);
    toast("친구를 작업실로 불렀어요.");
  }
  if (target.dataset.deleteFriend !== undefined) {
    const index = Number(target.dataset.deleteFriend);
    const d = dialog(
      `<h2>친구를 수첩에서 지울까요?</h2><p>현재 작업실의 친구와 여행 기록은 그대로 남아요.</p><button class="button primary full" id="confirm-delete">수첩에서 지우기</button>`,
    );
    el("#confirm-delete").onclick = () => {
      save.gallery.splice(index, 1);
      persist();
      d.close();
      renderCollection();
    };
  }
  if (target.id === "export-collection") exportSave();
});
el("#settings").onclick = () => {
  if (game?.running) {
    game.pause();
    settings();
    el<HTMLDialogElement>("#dialog").addEventListener(
      "close",
      () => game?.start(),
      { once: true },
    );
  } else settings();
};
el("#how-to").onclick = () => {
  if (game?.running) {
    game.pause();
    help();
    el<HTMLDialogElement>("#dialog").addEventListener(
      "close",
      () => game?.start(),
      { once: true },
    );
  } else help();
};
el("#continue-adventure").onclick = () => void play(nextLevel());
el("#workshop-adventure").onclick = () => void play(nextLevel());
el("#game-pause").onclick = pauseGame;
el("#mobile-game-help").onclick = () => {
  const wasRunning = game?.running;
  game?.pause();
  help();
  if (wasRunning)
    el<HTMLDialogElement>("#dialog").addEventListener(
      "close",
      () => game?.start(),
      { once: true },
    );
};
el("#game-back").onclick = pauseGame;
el("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el("#game-frame").requestFullscreen();
  } catch {
    toast("이 브라우저에서는 전체 화면을 사용할 수 없어요.");
  }
};
window.addEventListener("storage-error", () =>
  toast(
    "이 기기에 저장할 공간이 부족해요. 설정에서 여행을 파일로 보관해 주세요.",
  ),
);
window.addEventListener("workshop-error", () => {
  dialog(
    "<h2>작업실이 잠시 쉬고 있어요</h2><p>화면을 다시 열면 계속 꾸밀 수 있어요. 저장된 친구와 여행 기록은 그대로예요.</p>",
  );
});
window.addEventListener("save-changed", () => {
  el("#total-stars").textContent = String(totals());
});
window.addEventListener("pagehide", () => {
  if (workshop && current === "workshop")
    save.hero = normalizeHero(workshop.snapshot());
  persist();
});
document.body.classList.toggle("reduced-motion", save.settings.reducedMotion);
updateHome();
void show("home");

function updateKeyboardTray() {
  const viewport = window.visualViewport;
  const editing =
    current === "workshop" && document.activeElement?.id === "name";
  const offset =
    editing && viewport
      ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      : 0;
  document.body.classList.toggle("mobile-keyboard", offset > 80);
  document.documentElement.style.setProperty(
    "--keyboard-offset",
    `${offset}px`,
  );
}
window.visualViewport?.addEventListener("resize", updateKeyboardTray);
window.visualViewport?.addEventListener("scroll", updateKeyboardTray);
document.addEventListener("focusin", updateKeyboardTray);
document.addEventListener("focusout", () => {
  document.body.classList.remove("mobile-keyboard");
  document.documentElement.style.setProperty("--keyboard-offset", "0px");
});
