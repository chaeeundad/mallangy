import { save, persist } from "../storage";
import { STORY_PAGES } from "./pages";
import { illustration } from "./illustrations";
import { chime } from "../audio";
import "./storybook.css";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function mountStorybook(root: HTMLElement) {
  let active = false,
    page = save.storybook.page,
    message = "",
    celebrating = false;
  const progress = () => save.storybook;
  const found = () => new Set(progress().discoveries);
  function render(focus = false) {
    page = Math.max(0, Math.min(STORY_PAGES.length - 1, page));
    const data = STORY_PAGES[page],
      seen = found(),
      count = data.actions.filter((a) => seen.has(`${page}-${a.id}`)).length;
    root.classList.toggle("large-story-type", progress().largeText);
    root.innerHTML = `<div class="book-heading"><div><span class="eyebrow">THE LITTLE SEED OF LIGHT</span><h1>말랑이 이야기</h1><p>작은 손으로 넘기는, 우리들의 첫 번째 동화책</p></div><div class="book-tools"><button data-book-size aria-pressed="${progress().largeText}" title="글자 크기 조절">가<span>${progress().largeText ? "−" : "＋"}</span><span class="sr-only">글자 크게 보기</span></button><details class="book-contents"><summary>목차 <span>☷</span></summary><div class="book-contents-list" aria-label="동화 목차">${STORY_PAGES.map((p, i) => `<button data-book-page="${i}" ${i === page ? 'aria-current="page"' : ""}><span>${String(i + 1).padStart(2, "0")}</span>${p.title}</button>`).join("")}</div></details></div></div>
  <article class="storybook-spread" aria-labelledby="book-page-title"><div class="book-picture" style="--book-sky:${data.color}"><div class="book-scene">${illustration(page, seen, save.hero)}${data.actions
    .map((a) => {
      const done = seen.has(`${page}-${a.id}`);
      return `<button class="book-hotspot ${done ? "discovered" : ""}" data-book-action="${a.id}" aria-label="${a.label}" aria-pressed="${done}" style="left:${a.x}%;top:${a.y}%;width:${a.width}%;height:${a.height}%"><span aria-hidden="true">${done ? "✓" : "＋"}</span></button>`;
    })
    .join(
      "",
    )}</div><div class="book-art-caption"><span>그림 속에도 이야기가 숨어 있어요</span><span>${count} / ${data.actions.length} 발견</span></div></div><div class="book-paper"><span class="book-chapter">${data.chapter}</span><h2 id="book-page-title" tabindex="-1">${data.title}</h2><div class="book-prose">${data.paragraphs.map((p) => `<p>${escape(p.replaceAll("{name}", save.hero.name || "말랑이"))}</p>`).join("")}</div><div class="book-whisper" role="status" aria-live="polite"><span aria-hidden="true">✧</span><p>${message || data.hint}</p></div><span class="book-paper-number">${String(page + 1).padStart(2, "0")}</span></div></article>
  <div class="book-navigation"><button class="button soft" data-book-prev ${page === 0 ? "disabled" : ""}>← <span>이전 쪽</span></button><div class="book-bookmark"><span>${page + 1}<small> / ${STORY_PAGES.length} 쪽</small></span><div class="book-progress-track" role="progressbar" aria-label="동화 읽는 위치" aria-valuemin="1" aria-valuemax="${STORY_PAGES.length}" aria-valuenow="${page + 1}"><i style="width:${((page + 1) / STORY_PAGES.length) * 100}%"></i></div></div><button class="button primary" ${page === STORY_PAGES.length - 1 ? "data-book-finish" : "data-book-next"}>${page === STORY_PAGES.length - 1 ? "이야기 마치기" : "다음 쪽"} <span aria-hidden="true">→</span></button></div>
  <div class="book-reading-note"><span>책갈피는 자동으로 꽂아 둘게요. 그림 놀이를 모두 하지 않아도 괜찮아요.</span><button class="text-button" data-book-page="0">처음부터 읽기 ↶</button></div>
  ${celebrating ? `<section class="book-finished" role="status"><span>🌈</span><h2>한 권의 이야기를 함께 읽었어요</h2><p>너의 마음에는 어떤 색이 남았나요?<br>책을 덮어도 친구들의 모험은 계속돼요.</p><div><button class="button soft" data-book-page="0">다시 읽기</button><button class="button primary" data-screen="workshop">나만의 주인공 만들기 →</button></div></section>` : ""}`;
    if (focus)
      root
        .querySelector<HTMLElement>("#book-page-title")
        ?.focus({ preventScroll: true });
  }
  function go(next: number) {
    page = Math.max(0, Math.min(STORY_PAGES.length - 1, next));
    progress().page = page;
    message = "";
    celebrating = false;
    persist();
    chime("tap");
    render(true);
    root.scrollIntoView({ block: "start", behavior: "instant" });
  }
  root.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!button) return;
    if (button.dataset.bookPage !== undefined)
      go(Number(button.dataset.bookPage));
    else if (button.hasAttribute("data-book-prev")) go(page - 1);
    else if (button.hasAttribute("data-book-next")) go(page + 1);
    else if (button.hasAttribute("data-book-size")) {
      progress().largeText = !progress().largeText;
      persist();
      render();
      root.querySelector<HTMLElement>("[data-book-size]")?.focus();
    } else if (button.dataset.bookAction) {
      const action = STORY_PAGES[page].actions.find(
        (a) => a.id === button.dataset.bookAction,
      );
      if (!action) return;
      const key = `${page}-${action.id}`;
      if (!progress().discoveries.includes(key))
        progress().discoveries.push(key);
      message = action.reply;
      persist();
      chime("star");
      render();
      root
        .querySelector<HTMLElement>(`[data-book-action="${action.id}"]`)
        ?.focus({ preventScroll: true });
    } else if (button.hasAttribute("data-book-finish")) {
      progress().finished = true;
      celebrating = true;
      persist();
      chime("finish");
      render();
      root.querySelector(".book-finished")?.scrollIntoView({
        behavior: save.settings.reducedMotion ? "instant" : "smooth",
        block: "center",
      });
    }
  });
  document.addEventListener("keydown", (e) => {
    if (
      document.querySelector("dialog[open]") ||
      !active ||
      e.defaultPrevented ||
      (e.target as HTMLElement).closest(
        "input,select,textarea,summary,.book-contents-list",
      )
    )
      return;
    if (e.key === "ArrowRight" && page < STORY_PAGES.length - 1) {
      e.preventDefault();
      go(page + 1);
    }
    if (e.key === "ArrowLeft" && page > 0) {
      e.preventDefault();
      go(page - 1);
    }
  });
  let start: { x: number; y: number } | undefined;
  root.addEventListener("pointerdown", (e) => {
    if (
      (e.target as HTMLElement).closest("button,summary,details") ||
      !e.isPrimary
    )
      return;
    start = { x: e.clientX, y: e.clientY };
  });
  root.addEventListener("pointercancel", () => (start = undefined));
  root.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    start = undefined;
    if (Math.abs(dx) > 85 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0 && page < STORY_PAGES.length - 1) go(page + 1);
      if (dx > 0 && page > 0) go(page - 1);
    }
  });
  return {
    setActive(value: boolean) {
      active = value;
      if (value) {
        page = progress().page;
        message = "";
        celebrating = false;
        render();
      }
    },
  };
}
