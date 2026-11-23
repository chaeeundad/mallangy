import { chime } from "../audio";
import * as T from "three";
import { createMallangAvatar, disposeMallangAvatar } from "./avatar";
import { estimatePose } from "./pose";
import { createTerrain, REVEAL_RADIUS, STAR_HEIGHT } from "./terrain";
import { arAppearance, appearanceHero, type ArAppearance } from "./appearance";
import {
  createFamilyToken,
  familyLink,
  loadFamilyToken,
  storeFamilyToken,
} from "./family";
import { DEFAULT_HERO, type Hero } from "../data";
import { loadSave } from "../storage";
import { STARS, WORLD_LIMIT, COLLECT_RADIUS } from "../../backend/world.mjs";
import "./style.css";

const $ = <E extends HTMLElement>(id: string) =>
  document.getElementById(id) as E;
const app = $("app"),
  live = $("live"),
  video = $<HTMLVideoElement>("video"),
  viewport = $("viewport");
const canvas = $<HTMLCanvasElement>("overlay"),
  notice = $("notice"),
  track = $("track"),
  reticle = $("reticle");
const create = $<HTMLButtonElement>("create"),
  solo = $<HTMLButtonElement>("solo");
const cardId = $("card-id"),
  friends = $("friends"),
  count = $("count"),
  win = $<HTMLDialogElement>("win");
const reduced =
  loadSave().settings.reducedMotion ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const jumpButton = $<HTMLButtonElement>("ar-jump");
const soundButton = $<HTMLButtonElement>("ar-sound");
let soundOn = true,
  jumpSeq = 0,
  jumpedAt = -Infinity;
try {
  soundOn = localStorage.getItem("mallangy-ar-effects") !== "off";
} catch {}
function updateAudioButton() {
  soundButton.textContent = soundOn ? "소리 켜짐" : "소리 꺼짐";
  soundButton.setAttribute("aria-pressed", String(soundOn));
}
function jumpHeight(time: number, startedAt: number) {
  const phase = (time - startedAt) / 550;
  return phase >= 0 && phase < 1
    ? Math.sin(phase * Math.PI) * (reduced ? 0.13 : 0.38)
    : 0;
}
updateAudioButton();
const scan = document.createElement("canvas");
const scanCtx = scan.getContext("2d", { willReadFrequently: true })!;
const { AR } = window as unknown as {
  AR?: {
    Detector: new (o: {
      dictionaryName: string;
      maxHammingDistance: number;
    }) => {
      detect(
        image: ImageData,
      ): { id: number; corners: { x: number; y: number }[] }[];
    };
  };
};
const detector = AR
  ? new AR.Detector({
      dictionaryName: "ARUCO_MIP_36h12",
      maxHammingDistance: 2,
    })
  : null;
type Player = {
  id: string;
  seat: number;
  x: number;
  z: number;
  active: boolean;
  avatar?: unknown;
  jump?: number;
  look?: ArAppearance;
  lookKey?: string;
};
function preparePlayers(players: Player[]) {
  return players.map((player) => {
    const look = arAppearance(player.avatar);
    return { ...player, look, lookKey: JSON.stringify(look) };
  });
}
type Room = {
  code: string;
  token: string;
  playerId: string;
  players: Player[];
  stars: string[];
};
type Mode = "solo" | "multi";
type Actor = {
  group: T.Group;
  avatar: T.Group;
  shadow: T.Mesh;
  appearance: string;
  lastJump?: number;
  jumpAt?: number;
};

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(55, 1, 0.025, 100);
const anchor = new T.Group();
anchor.visible = false;
scene.add(anchor);
function light(s: T.Scene) {
  s.add(new T.HemisphereLight("#fff5df", "#9982b9", 2.2));
  const key = new T.DirectionalLight("#fff7de", 2);
  key.position.set(-3, 6, 4);
  s.add(key);
}
light(scene);
anchor.add(createTerrain(STARS));
const starShape = new T.Shape();
for (let i = 0; i < 10; i++) {
  const theta = Math.PI / 2 + (i * Math.PI) / 5,
    rad = i % 2 === 0 ? 0.154 : 0.072;
  const xp = Math.cos(theta) * rad,
    yp = Math.sin(theta) * rad;
  if (i === 0) starShape.moveTo(xp, yp);
  else starShape.lineTo(xp, yp);
}
starShape.closePath();
const starGeo = new T.ExtrudeGeometry(starShape, {
  depth: 0.041,
  bevelEnabled: true,
  bevelThickness: 0.016,
  bevelSize: 0.016,
  bevelSegments: 2,
  steps: 1,
});
starGeo.translate(0, 0, -0.021);
const starMat = new T.MeshStandardMaterial({
  color: "#ffcf42",
  emissive: "#b75a03",
  emissiveIntensity: 0.48,
  roughness: 0.34,
  metalness: 0.12,
});
const stars = STARS.map((d) => {
  const mesh = new T.Mesh(starGeo, starMat);
  mesh.position.set(d.x, STAR_HEIGHT, d.z);
  mesh.visible = false;
  mesh.name = "Star " + d.id;
  anchor.add(mesh);
  return { ...d, mesh };
});
const shadowGeo = new T.CircleGeometry(0.33, 30);
const shadowMat = new T.MeshBasicMaterial({
  color: "#4d2864",
  transparent: true,
  opacity: 0.29,
  depthWrite: false,
});
const actors = new Map<string, Actor>();
let room: Room | null = null,
  mode: Mode | null = null,
  stream: MediaStream | null = null,
  renderer: T.WebGLRenderer | null = null;
let started = false,
  inFlight = false,
  frame = 0,
  syncTimer = 0,
  sequence = 0,
  detectedAt = 0,
  scanAt = 0,
  lastFrame = 0,
  lastVideo = -1;
let x = 0,
  z = 0,
  destination = new T.Vector2(),
  wasTracking = false,
  won = false,
  tracked = false,
  synced = true;
let found = new Set<string>();
let focal = 0,
  markerId: number | null = null,
  candidate: number | null = null;
let candidateSince = 0,
  entering = false,
  enterAfter = 0,
  enterError = "",
  roomRevision = 0;
const right = new T.Vector3(),
  up = new T.Vector3(),
  front = new T.Vector3(),
  newPos = new T.Vector3();
const nextRot = new T.Quaternion(),
  basis = new T.Matrix4();
const raycaster = new T.Raycaster(),
  plane = new T.Plane(),
  hit = new T.Vector3(),
  angles = new T.Vector2();

let chosenAppearance = arAppearance(DEFAULT_HERO),
  sessionAppearance = chosenAppearance;
let sessionLookKey = JSON.stringify(sessionAppearance);
let sessionZone = "",
  familyToken = loadFamilyToken();
const chooser = $<HTMLSelectElement>("avatar-select");
const familyNew = $<HTMLButtonElement>("family-new"),
  familyCopy = $<HTMLButtonElement>("family-copy");
const familyUrl = $<HTMLInputElement>("family-url");
let localChoices: Hero[] = [];
function updateChoices() {
  const saved = loadSave();
  localChoices = [saved.hero, ...saved.gallery];
  const previous = chooser.value;
  chooser.replaceChildren(
    ...localChoices.map((hero, index) => {
      const label = hero.name || "이름 없는 친구";
      return new Option(
        index === 0 ? `지금 작업실 친구 · ${label}` : label,
        String(index),
      );
    }),
  );
  if (previous && Number(previous) < localChoices.length)
    chooser.value = previous;
  chosenAppearance = arAppearance(localChoices[Number(chooser.value)]);
}
function updateFamilyUI() {
  $("family-status").textContent = familyToken
    ? "가족 놀이 준비가 됐어요. 다른 휴대폰에서 같은 링크를 열어요."
    : "같이 놀려면 가족 링크를 만들거나 받은 링크를 열어요.";
  familyNew.hidden = Boolean(familyToken);
  familyCopy.hidden = !familyToken;
  create.disabled = !familyToken || mode !== null;
  familyUrl.hidden = true;
  familyUrl.value = "";
}
function seatKey(id: number, zone: string) {
  return "mallang-ar-seat-v1-" + zone + "-" + id;
}
function actor(
  id: string,
  look: ArAppearance,
  appearance = JSON.stringify(look),
) {
  const existing = actors.get(id);
  if (existing) {
    if (existing.appearance !== appearance) {
      disposeMallangAvatar(existing.avatar);
      existing.avatar = createMallangAvatar(appearanceHero(look));
      existing.avatar.scale.setScalar(0.58);
      existing.group.add(existing.avatar);
      existing.appearance = appearance;
    }
    return existing;
  }
  const group = new T.Group(),
    avatar = createMallangAvatar(appearanceHero(look));
  avatar.scale.setScalar(0.58);
  const shadow = new T.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.013;
  group.add(shadow, avatar);
  anchor.add(group);
  const result: Actor = { group, avatar, shadow, appearance };
  actors.set(id, result);
  return result;
}
function initRenderer(target: HTMLCanvasElement, antialias = true) {
  const r = new T.WebGLRenderer({
    canvas: target,
    alpha: true,
    antialias,
    powerPreference: "low-power",
  });
  r.outputColorSpace = T.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  return r;
}
function status(msg: string) {
  if (track.textContent !== msg) track.textContent = msg;
}
function lobbyMessage(msg: string, error = false) {
  notice.textContent = msg;
  notice.toggleAttribute("data-error", error);
}
function resizeLive() {
  if (!renderer || !video.videoWidth) return;
  const frameRatio = video.videoWidth / video.videoHeight;
  const w = Math.max(viewport.clientWidth, viewport.clientHeight * frameRatio);
  const h = w / frameRatio;
  for (const el of [video, canvas]) {
    el.style.width = w + "px";
    el.style.height = h + "px";
  }
  const pixel = Math.min(1.5, devicePixelRatio, 1280 / w, 1280 / h);
  renderer.setSize(
    Math.max(1, Math.round(w * pixel)),
    Math.max(1, Math.round(h * pixel)),
    false,
  );
  const scale = Math.min(
    1,
    620 / Math.max(video.videoWidth, video.videoHeight),
  );
  scan.width = Math.round(video.videoWidth * scale);
  scan.height = Math.round(video.videoHeight * scale);
  // Approximate intrinsics; the video and WebGL canvas use precisely the same centered crop.
  focal = 0.94 * Math.max(scan.width, scan.height);
  camera.aspect = scan.width / scan.height;
  camera.fov = T.MathUtils.radToDeg(2 * Math.atan(scan.height / (2 * focal)));
  camera.updateProjectionMatrix();
  lastVideo = -1;
}
function scanFrame(t: number) {
  if (
    !detector ||
    video.readyState < 2 ||
    !scan.width ||
    t - scanAt < 41 ||
    lastVideo === video.currentTime
  )
    return;
  scanAt = t;
  lastVideo = video.currentTime;
  scanCtx.drawImage(video, 0, 0, scan.width, scan.height);
  const markers = detector.detect(
    scanCtx.getImageData(0, 0, scan.width, scan.height),
  );
  const primary = markers.find((v) => v.id === markerId);
  if (primary) {
    candidate = null;
    candidateSince = 0;
  }
  let m = primary;
  if (!m) {
    if (!markers.length || t - detectedAt < 380) {
      candidate = null;
      candidateSince = 0;
      return;
    }
    const area = (v: (typeof markers)[number]) =>
      Math.abs(
        v.corners.reduce(
          (n, p, i) =>
            n + p.x * v.corners[(i + 1) % 4].y - p.y * v.corners[(i + 1) % 4].x,
          0,
        ),
      );
    m = markers.sort((a, b) => area(b) - area(a))[0];
    if (m.id !== candidate) {
      candidate = m.id;
      candidateSince = t;
      return;
    }
    if (t - candidateSince < (markerId === null ? 100 : 550)) return;
    if (markerId !== m.id) {
      if (mode === "multi") leaveRoom();
      markerId = m.id;
      detectedAt = 0;
      enterAfter = 0;
      enterError = "";
      renderRoom();
      candidate = null;
      candidateSince = 0;
    }
  }
  const pose = estimatePose(m.corners, scan.width, scan.height, focal);
  if (!pose) return;
  if (!detectedAt || t - detectedAt > 220) {
    anchor.position.fromArray(pose.position);
    anchor.quaternion.setFromRotationMatrix(
      basis.makeBasis(
        right.fromArray(pose.right),
        up.fromArray(pose.up),
        front.fromArray(pose.front),
      ),
    );
  } else {
    anchor.position.lerp(newPos.fromArray(pose.position), 0.48);
    nextRot.setFromRotationMatrix(
      basis.makeBasis(
        right.fromArray(pose.right),
        up.fromArray(pose.up),
        front.fromArray(pose.front),
      ),
    );
    anchor.quaternion.slerp(nextRot, 0.43);
  }
  detectedAt = t;
}
function applyStars(ids: string[], audible = false) {
  const gained = ids.some((id) => !found.has(id));
  found = new Set(ids);
  if (gained && audible)
    chime(found.size === stars.length ? "finish" : "star", soundOn);
  count.textContent = "별 " + found.size + " / " + stars.length;
  for (const d of stars) if (found.has(d.id)) d.mesh.visible = false;
  if (found.size === stars.length && !won) {
    won = true;
    if (typeof win.showModal === "function" && !win.open) win.showModal();
    else status("별빛을 모두 찾았어요!");
  }
}
function animate(t: number) {
  if (!started || !renderer) return;
  const dt = Math.min(0.055, (t - (lastFrame || t)) / 1000);
  lastFrame = t;
  try {
    scanFrame(t);
  } catch {
    status("카드를 읽지 못했어요. 카메라를 다시 켜 주세요.");
  }
  tracked = detectedAt > 0 && t - detectedAt < 240;
  if (tracked !== wasTracking) {
    status(
      tracked
        ? "별 가까이 바닥을 톡 눌러 이동해요."
        : "카드 전체가 보이도록 비춰요.",
    );
    reticle.hidden = tracked;
    wasTracking = tracked;
  }
  if (tracked) {
    const dx = destination.x - x,
      dz = destination.y - z,
      d = Math.hypot(dx, dz);
    const speed = 0.98 * dt;
    if (d > 1e-4) {
      const move = Math.min(1, speed / d);
      x += dx * move;
      z += dz * move;
    }
    if (
      mode === "multi" &&
      markerId !== null &&
      !room &&
      !entering &&
      t >= enterAfter
    )
      void enterMarker(markerId, sequence);
    const me = actor(
      room?.playerId ?? "solo",
      sessionAppearance,
      sessionLookKey,
    );
    me.group.position.set(x, 0, z);
    me.group.visible = true;
    if (d > 0.012) {
      const theta = Math.atan2(dx, dz);
      const delta = Math.atan2(
        Math.sin(theta - me.group.rotation.y),
        Math.cos(theta - me.group.rotation.y),
      );
      me.group.rotation.y += delta * Math.min(1, dt * 15);
    }
    me.avatar.position.y =
      jumpHeight(t, jumpedAt) ||
      (!reduced && d > 0.012 ? Math.abs(Math.sin(t * 0.009)) * 0.055 : 0);
    if (mode === "solo") {
      const nf = stars.filter(
        (d) =>
          !found.has(d.id) && Math.hypot(x - d.x, z - d.z) <= COLLECT_RADIUS,
      );
      if (nf.length) applyStars([...found, ...nf.map((d) => d.id)], true);
    }
    let revealed = false;
    for (const [i, d] of stars.entries()) {
      d.mesh.visible =
        !found.has(d.id) && Math.hypot(x - d.x, z - d.z) <= REVEAL_RADIUS;
      if (d.mesh.visible) {
        revealed = true;
        d.mesh.rotation.y = reduced ? 0 : t * 0.00105 + i * 0.33;
        d.mesh.position.y =
          STAR_HEIGHT + (reduced ? 0 : Math.sin(t * 0.0026 + i) * 0.037);
      }
    }
    for (const p of room?.players ?? []) {
      if (p.id === room?.playerId) continue;
      if (!p.look || !p.lookKey) continue;
      const a = actor(p.id, p.look, p.lookKey);
      a.group.visible = p.active;
      const dx = p.x - a.group.position.x,
        dz = p.z - a.group.position.z;
      if (
        a.lastJump !== undefined &&
        p.jump !== undefined &&
        a.lastJump !== p.jump
      )
        a.jumpAt = t;
      a.lastJump = p.jump;
      const moving = Math.hypot(dx, dz) > 0.009;
      if (moving) a.group.rotation.y = Math.atan2(dx, dz);
      a.avatar.position.y =
        jumpHeight(t, a.jumpAt ?? -Infinity) ||
        (!reduced && moving
          ? Math.abs(Math.sin(t * 0.009 + p.seat)) * 0.05
          : 0);
      const k = Math.min(1, dt * 11);
      a.group.position.x += dx * k;
      a.group.position.z += dz * k;
    }
    if (mode === "multi" && !room)
      status(enterError || "같은 카드의 친구들을 찾고 있어요.");
    else if (!synced) status("방 연결을 다시 확인하고 있어요.");
    else if (!won)
      status(
        revealed
          ? "숨은 별이다! 별을 톡 눌러 가까이 가요."
          : "풀숲과 바위를 살펴봐요. 바닥을 톡 누르면 이동해요.",
      );
  }
  anchor.visible = tracked && (mode === "solo" || room !== null);
  const canJump = anchor.visible && !win.open && t - jumpedAt >= 550;
  if (jumpButton.disabled === canJump) jumpButton.disabled = !canJump;
  renderer.render(scene, camera);
  frame = requestAnimationFrame(animate);
}
function moveAt(event: PointerEvent) {
  if (!started || !tracked || win.open || (mode === "multi" && !room)) return;
  const area = canvas.getBoundingClientRect();
  angles.set(
    ((event.clientX - area.left) / area.width) * 2 - 1,
    1 - ((event.clientY - area.top) / area.height) * 2,
  );
  raycaster.setFromCamera(angles, camera);
  const starHit = raycaster.intersectObjects(
    stars.filter((d) => d.mesh.visible).map((d) => d.mesh),
    false,
  )[0];
  if (starHit) {
    const d = stars.find((v) => v.mesh === starHit.object)!;
    destination.set(d.x, d.z);
    return;
  }
  plane.setFromNormalAndCoplanarPoint(
    up.set(0, 1, 0).applyQuaternion(anchor.quaternion),
    anchor.position,
  );
  if (raycaster.ray.intersectPlane(plane, hit)) {
    anchor.worldToLocal(hit);
    if (
      Math.abs(hit.x) > WORLD_LIMIT + 0.7 ||
      Math.abs(hit.z) > WORLD_LIMIT + 0.7
    )
      return;
    destination.set(
      T.MathUtils.clamp(hit.x, -WORLD_LIMIT, WORLD_LIMIT),
      T.MathUtils.clamp(hit.z, -WORLD_LIMIT, WORLD_LIMIT),
    );
  }
}
async function call(
  path: string,
  body: object,
  options: RequestInit = {},
  zone = sessionZone,
) {
  const r = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "x-mallang-zone": zone },
    body: JSON.stringify(body),
    cache: "no-store",
    referrerPolicy: "no-referrer",
    ...options,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) {
    const msgs: Record<string, string> = {
      room_not_found: "놀이방이 끝났어요. 같은 카드에 다시 연결해요.",
      zone_required: "가족 링크를 열고 다시 시작해 주세요.",
      invalid_zone: "가족 링크를 열고 다시 시작해 주세요.",
      invalid_family: "가족 링크를 열고 다시 시작해 주세요.",
      room_full: "이 방은 이미 네 명으로 찼어요.",
      room_service_unavailable:
        "지금 방 서비스에 연결되지 않아요. 잠시 뒤에 다시 시도해 주세요.",
    };
    const e = new Error(msgs[data?.error] || "방에 연결하지 못했어요.");
    e.name = data?.error || "RoomError";
    throw e;
  }
  return data;
}
function renderRoom() {
  cardId.hidden = markerId === null;
  if (markerId !== null)
    cardId.textContent = "카드 " + String(markerId).padStart(3, "0");
  friends.hidden = !room;
  if (room)
    friends.textContent =
      "함께 " +
      (room.players.filter((p) => p.active && p.id !== room?.playerId).length +
        1) +
      "명";
}
function forgetActors() {
  for (const a of actors.values()) {
    anchor.remove(a.group);
    disposeMallangAvatar(a.avatar);
  }
  actors.clear();
}
function saveSeat(old: Room, id: number) {
  try {
    sessionStorage.setItem(
      seatKey(id, sessionZone),
      JSON.stringify({ code: old.code, token: old.token }),
    );
  } catch {}
}
function leaveRoom() {
  roomRevision++;
  entering = false;
  inFlight = false;
  const old = room;
  room = null;
  if (old) {
    if (markerId !== null) saveSeat(old, markerId);
    void call(
      "/api/rooms/" + old.code + "/sync",
      { token: old.token, x, z, active: false },
      { keepalive: true },
    ).catch(() => {});
  }
  if (win.open) win.close();
  won = false;
  synced = true;
  applyStars([]);
  forgetActors();
}
async function enterMarker(id: number, n: number) {
  const ri = roomRevision,
    zone = sessionZone;
  entering = true;
  enterError = "";
  try {
    let prior = null;
    try {
      prior = JSON.parse(sessionStorage.getItem(seatKey(id, zone)) || "null");
    } catch {}
    const result = await call(
      "/api/markers/" + id + "/enter",
      {
        ...(prior?.token && prior?.code
          ? { token: prior.token, code: prior.code }
          : {}),
        avatar: sessionAppearance,
      },
      {},
      zone,
    );
    if (sequence !== n || markerId !== id || roomRevision !== ri || !started) {
      void call(
        "/api/rooms/" + result.code + "/sync",
        { token: result.token, x: 0, z: 0, active: false },
        { keepalive: true },
        zone,
      ).catch(() => {});
      return;
    }
    room = { ...result, players: preparePlayers(result.players) } as Room;
    const my = room.players.find((p) => p.id === room?.playerId);
    jumpSeq = my?.jump ?? 0;
    jumpedAt = -Infinity;
    x = my?.x ?? 0;
    z = my?.z ?? 0;
    destination.set(x, z);
    saveSeat(room, id);
    forgetActors();
    renderRoom();
    applyStars(room.stars);
  } catch (e) {
    if (sequence === n && markerId === id && roomRevision === ri) {
      enterError = (e as Error).message || "놀이방에 연결하지 못했어요.";
      enterAfter = performance.now() + 3600;
    }
  } finally {
    if (sequence === n && markerId === id && roomRevision === ri)
      entering = false;
  }
}
async function sync(n: number) {
  if (!room || inFlight || n !== sequence || !started) return;
  inFlight = true;
  const { code, token } = room;
  const ri = roomRevision;
  try {
    const result = await call("/api/rooms/" + code + "/sync", {
      token,
      x,
      z,
      active: tracked,
      jump: jumpSeq,
    });
    if (n !== sequence || !room || ri !== roomRevision) return;
    room = {
      ...room,
      players: preparePlayers(result.players),
      stars: result.stars,
    };
    synced = true;
    const activeIds = new Set(room.players.map((p) => p.id));
    for (const [id, a] of actors) {
      if (id !== room.playerId && !activeIds.has(id)) {
        anchor.remove(a.group);
        disposeMallangAvatar(a.avatar);
        actors.delete(id);
      }
    }
    renderRoom();
    applyStars(room.stars, true);
  } catch (e) {
    if (n === sequence && ri === roomRevision) {
      if ((e as Error).name === "room_or_player_not_found") {
        leaveRoom();
        renderRoom();
        enterAfter = 0;
      } else synced = false;
    }
  } finally {
    if (n === sequence && ri === roomRevision) inFlight = false;
  }
}
function cleanup(silent = false) {
  sequence++;
  started = false;
  inFlight = false;
  cancelAnimationFrame(frame);
  clearInterval(syncTimer);
  leaveRoom();
  markerId = null;
  candidate = null;
  candidateSince = 0;
  enterAfter = 0;
  enterError = "";
  if (stream) for (const tr of stream.getTracks()) tr.stop();
  stream = null;
  video.srcObject = null;
  app.hidden = false;
  live.hidden = true;
  anchor.visible = false;
  if (win.open) win.close();
  stopHint();
  if (!silent) lobbyMessage("카메라를 껐어요. 다시 모험을 시작할 수 있어요.");
  solo.disabled = false;
}
function stopHint() {
  reticle.hidden = false;
  detectedAt = 0;
  tracked = false;
  wasTracking = false;
}
function errorMessage(e: unknown) {
  const error = e as Error;
  if (error.name === "NotAllowedError" || error.name === "SecurityError")
    return "Safari에서 직접 열고 카메라를 허용해 주세요.";
  if (error.name === "NotFoundError") return "사용할 수 있는 카메라가 없어요.";
  if (error.name === "NotReadableError")
    return "다른 앱의 카메라를 끈 뒤 다시 시도해 주세요.";
  return error.message || "시작하지 못했어요. 다시 시도해 주세요.";
}
async function start(next: Mode) {
  if (started || mode !== null) return;
  if (next === "multi" && !familyToken) {
    lobbyMessage("가족 링크로 먼저 들어와 주세요.", true);
    return;
  }
  if (!detector) {
    lobbyMessage(
      "카드 읽기 도구를 불러오지 못했어요. 페이지를 새로 열어 주세요.",
      true,
    );
    return;
  }
  sessionZone = next === "multi" ? familyToken : "";
  sessionAppearance = chosenAppearance;
  sessionLookKey = JSON.stringify(sessionAppearance);
  if (!navigator.mediaDevices?.getUserMedia) {
    lobbyMessage("안전한 Safari 창에서 이 링크를 열어 주세요.", true);
    return;
  }
  mode = next;
  jumpSeq = 0;
  jumpedAt = -Infinity;
  chime("tap", soundOn);
  const n = ++sequence;
  create.disabled = true;
  solo.disabled = true;
  lobbyMessage("카메라를 켜는 중이에요.");
  try {
    try {
      renderer ??= initRenderer(canvas, false);
    } catch {
      throw new Error(
        "3D 그래픽을 사용할 수 없어요. 아이폰 Safari에서 다시 열어 주세요.",
      );
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 960 },
        height: { ideal: 720 },
      },
    });
    if (n !== sequence) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      return;
    }
    forgetActors();
    markerId = null;
    candidate = null;
    candidateSince = 0;
    enterAfter = 0;
    enterError = "";
    entering = false;
    synced = true;
    won = false;
    lastFrame = 0;
    lastVideo = -1;
    scanAt = 0;
    stopHint();
    x = 0;
    z = 0;
    destination.set(0, 0);
    applyStars([]);
    renderRoom();
    status("카드 전체가 보이도록 비춰요.");
    video.srcObject = stream;
    app.hidden = true;
    live.hidden = false;
    await video.play();
    if (n !== sequence) return;
    resizeLive();
    started = true;
    frame = requestAnimationFrame(animate);
    syncTimer = window.setInterval(() => void sync(n), 260);
  } catch (e) {
    if (n === sequence) {
      cleanup(true);
      lobbyMessage(errorMessage(e), true);
    }
  } finally {
    mode = started ? next : null;
    updateFamilyUI();
  }
}

updateChoices();
updateFamilyUI();
chooser.addEventListener("change", () => {
  chosenAppearance = arAppearance(localChoices[Number(chooser.value)]);
});
addEventListener("pageshow", updateChoices);
addEventListener("storage", () => {
  if (!started) updateChoices();
});
addEventListener("hashchange", () => {
  familyToken = loadFamilyToken();
  if (!started) updateFamilyUI();
});
familyNew.addEventListener("click", () => {
  if (familyToken) return;
  try {
    familyToken = createFamilyToken();
    storeFamilyToken(familyToken);
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
    updateFamilyUI();
    lobbyMessage("가족 링크를 만들었어요. 같이 놀 휴대폰에 보내 주세요.");
  } catch {
    lobbyMessage("안전한 브라우저에서 가족 링크를 다시 만들어 주세요.", true);
  }
});
familyCopy.addEventListener("click", async () => {
  if (!familyToken) return;
  const link = familyLink(familyToken);
  try {
    await navigator.clipboard.writeText(link);
    lobbyMessage("가족 링크를 복사했어요. 다른 휴대폰에 보내 주세요.");
  } catch {
    familyUrl.value = link;
    familyUrl.hidden = false;
    familyUrl.focus();
    familyUrl.select();
    lobbyMessage("위의 링크를 길게 눌러 복사해 주세요.");
  }
});
jumpButton.addEventListener("click", () => {
  const now = performance.now();
  if (!started || !anchor.visible || win.open || now - jumpedAt < 550) return;
  jumpedAt = now;
  jumpSeq++;
  chime("jump", soundOn);
  void sync(sequence);
});
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  try {
    localStorage.setItem("mallangy-ar-effects", soundOn ? "on" : "off");
  } catch {}
  updateAudioButton();
  if (soundOn) chime("tap", true);
});
create.addEventListener("click", () => void start("multi"));
solo.addEventListener("click", () => void start("solo"));
$("stop").addEventListener("click", () => {
  cleanup();
  mode = null;
  updateFamilyUI();
});
$("stay").addEventListener("click", () => win.close());
viewport.addEventListener("pointerdown", moveAt);
viewport.addEventListener("pointermove", (e) => {
  if (e.buttons === 1) moveAt(e);
});
video.addEventListener("resize", resizeLive);
addEventListener("resize", resizeLive);
addEventListener("pagehide", () => {
  cleanup(true);
  mode = null;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) {
    cleanup(true);
    mode = null;
    updateFamilyUI();
    lobbyMessage("잠깐 화면을 떠나 카메라를 껐어요.");
  }
});
try {
  const preview = $<HTMLCanvasElement>("preview");
  const rend = initRenderer(preview);
  $("fallback").hidden = true;
  let previewAppearance = JSON.stringify(chosenAppearance);
  let model = createMallangAvatar(appearanceHero(chosenAppearance));
  model.rotation.y = -0.22;
  const pScene = new T.Scene();
  pScene.add(model);
  light(pScene);
  const pCam = new T.PerspectiveCamera(33, 1, 0.025, 100);
  pCam.position.set(0, 0.66, 2.7);
  pCam.lookAt(0, 0.43, 0);
  let hopAt = -1000;
  function drawPreview(t: number) {
    if (!app.hidden) {
      const key = JSON.stringify(chosenAppearance);
      if (previewAppearance !== key) {
        disposeMallangAvatar(model);
        model = createMallangAvatar(appearanceHero(chosenAppearance));
        pScene.add(model);
        previewAppearance = key;
      }
      const w = preview.clientWidth,
        h = preview.clientHeight;
      if (w && h) {
        const dpr = Math.min(1.6, devicePixelRatio);
        const rw = Math.round(w * dpr),
          rh = Math.round(h * dpr);
        if (preview.width !== rw || preview.height !== rh) {
          pCam.aspect = w / h;
          pCam.updateProjectionMatrix();
          rend.setSize(rw, rh, false);
        }
        const elapsed = t - hopAt;
        const jump =
          !reduced && elapsed < 520
            ? Math.sin((Math.PI * elapsed) / 520) * 0.23
            : 0;
        model.position.y = 0.025 + jump;
        model.scale.set(1 + jump * 0.13, 1 - jump * 0.13, 1 + jump * 0.13);
        model.rotation.y = -0.21 + (reduced ? 0 : Math.sin(t * 0.0015) * 0.19);
        rend.render(pScene, pCam);
      }
    }
    requestAnimationFrame(drawPreview);
  }
  $("previewHop").addEventListener("click", () => {
    hopAt = performance.now();
  });
  requestAnimationFrame(drawPreview);
} catch {
  $("previewHop").addEventListener("click", () =>
    $("fallback").animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-16%)" },
        { transform: "translateY(0)" },
      ],
      { duration: 440 },
    ),
  );
}
