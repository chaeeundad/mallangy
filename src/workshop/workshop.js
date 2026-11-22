import * as THREE from "three";
import { COLORS } from "../data";
import { workshopStorage, save, persist } from "../storage";
import "./legacy.css";
export function mountWorkshop() {
  let active = true,
    frameId = 0,
    lastNormals = 0;
  const undoStack = [];
  function removeMesh(object) {
    blob.remove(object);
    object.traverse((child) => {
      child.geometry?.dispose();
      for (const mat of [child.material].flat().filter(Boolean)) {
        mat.map?.dispose();
        mat.dispose();
      }
    });
  }
  const stage = document.querySelector("#stage");
  function releasePointer() {
    pointerDown = false;
    lastPointer = null;
    pressDepthTargets?.fill(0);
  }
  window.addEventListener("blur", releasePointer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releasePointer();
  });
  const adventure = { mode: false };
  const colors = [
    { name: "딸기", hex: "#ff6f91" },
    { name: "복숭아", hex: "#ff9fb0" },
    { name: "산호", hex: "#ff806e" },
    { name: "귤", hex: "#ffad57" },
    { name: "레몬", hex: "#ffd84d" },
    { name: "바나나", hex: "#ffe98a" },
    { name: "연두", hex: "#b9df68" },
    { name: "민트", hex: "#70d8b2" },
    { name: "바다", hex: "#40c4c4" },
    { name: "하늘", hex: "#73c7f5" },
    { name: "파랑", hex: "#6889eb" },
    { name: "포도", hex: "#9b79e8" },
    { name: "라일락", hex: "#c49cf4" },
    { name: "장미", hex: "#ed79c5" },
    { name: "코코아", hex: "#9d6d62" },
    { name: "우유", hex: "#fff0cf" },
  ];
  colors.forEach((color, i) => (color.hex = COLORS[i]));
  const shapes = [
    { name: "동글이", emoji: "🟠" },
    { name: "복숭아", emoji: "🍑" },
    { name: "별이", emoji: "⭐" },
    { name: "고양이", emoji: "🐱" },
    { name: "토끼", emoji: "🐰" },
    { name: "곰돌이", emoji: "🐻" },
    { name: "개구리", emoji: "🐸" },
    { name: "오리", emoji: "🦆" },
    { name: "딸기", emoji: "🍓" },
    { name: "푸딩", emoji: "🍮" },
  ];
  const expressions = ["😊", "😋", "😴", "🥰"],
    stickerChoices = ["🌼", "💖", "⭐", "🍓", "🎀", "✨"];
  let state = {
    name: "",
    colorIndex: 0,
    baseColorIndex: 0,
    faceIndex: 0,
    shapeIndex: 0,
    slangi: false,
    slangiSound: "putty",
    stickers: [],
    paint: [],
    crunch: [],
  };
  try {
    state = {
      ...state,
      ...JSON.parse(workshopStorage.getItem("malang-draft") || "{}"),
    };
  } catch {}
  let colorIndex = state.colorIndex,
    baseColorIndex = state.baseColorIndex ?? state.colorIndex,
    faceIndex = state.faceIndex,
    shapeIndex = state.shapeIndex,
    tool = "squish",
    stickerChoice = stickerChoices[0],
    crunchKind = "rainbow",
    peekInside = false;
  let renderer,
    scene,
    camera,
    blob,
    faceGroup,
    geometry,
    basePositions,
    unitPositions,
    velocities,
    pressDepthTargets,
    eyes = [],
    mouth,
    duckBeak,
    faceBindings = [],
    surfaceBindings = [],
    pointerDown = false,
    lastPointer = null,
    paintAttribute;
  let audioContext = null,
    soundEnabled = save.settings.sound,
    lastSoundAt = 0,
    noiseSample = null;
  const raycaster = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    clock = new THREE.Clock();
  function resizeAdventureCanvas() {}
  function refreshAdventureHeroes() {}
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    camera.position.set(0, 0, 7.3);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.domElement.classList.add("workshop-canvas");
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    stage.prepend(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xfff4f8, 0x9a91bd, 2.15));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 4, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffbfd0, 1.6);
    fill.position.set(4, -2, 4);
    scene.add(fill);
    geometry = new THREE.SphereGeometry(1.34, 56, 40);
    unitPositions = geometry.attributes.position.array.slice();
    basePositions = unitPositions.slice();
    velocities = new Float32Array(basePositions.length);
    pressDepthTargets = new Float32Array(geometry.attributes.position.count);
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Float32Array(geometry.attributes.position.count * 3).fill(1),
        3,
      ),
    );
    paintAttribute = geometry.attributes.color;
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.27,
      clearcoat: 0.55,
      clearcoatRoughness: 0.19,
    });
    blob = new THREE.Mesh(geometry, mat);
    blob.scale.set(1, 1.08, 0.78);
    scene.add(blob);
    faceGroup = new THREE.Group();
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x49394a }),
      whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff }),
      eyeGeo = new THREE.SphereGeometry(0.07, 20, 16);
    for (const x of [-0.28, 0.28]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.12, 1.39);
      faceGroup.add(eye);
      eyes.push(eye);
      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 10),
        whiteMat,
      );
      glint.position.set(x - 0.02, 0.15, 1.46);
      faceGroup.add(glint);
    }
    const cheekMat = new THREE.MeshBasicMaterial({
      color: 0xff758f,
      transparent: true,
      opacity: 0.52,
    });
    for (const x of [-0.48, 0.48]) {
      const c = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 18, 12),
        cheekMat,
      );
      c.scale.set(1, 0.55, 0.35);
      c.position.set(x, -0.11, 1.34);
      faceGroup.add(c);
    }
    mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.026, 10, 28, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x754557 }),
    );
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, -0.12, 1.4);
    faceGroup.add(mouth);
    duckBeak = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xffa52e, roughness: 0.32 }),
    );
    duckBeak.scale.set(1.25, 0.62, 0.7);
    duckBeak.position.set(0, -0.1, 1.48);
    duckBeak.visible = shapeIndex === 7;
    faceGroup.add(duckBeak);
    blob.add(faceGroup);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8876a8,
        transparent: true,
        opacity: 0.12,
      }),
    );
    shadow.scale.set(1.3, 0.28, 1);
    shadow.position.set(0, -1.7, -0.5);
    scene.add(shadow);
    resize();
    new ResizeObserver(resize).observe(stage);
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", () => {
      pointerDown = false;
      lastPointer = null;
      pressDepthTargets.fill(0);
    });
    setShape(shapeIndex);
    loadPaint(state.paint || []);
    loadStickers(state.stickers || []);
    loadCrunch(state.crunch || []);
    setSlangi(Boolean(state.slangi));
    applyFace();
    animate();
  }
  function resize() {
    if (!renderer) return;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 8.3 : 7.3;
    camera.updateProjectionMatrix();
    resizeAdventureCanvas();
  }
  function setShape(index) {
    shapeIndex = index;
    const a = geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let x = unitPositions[i * 3],
        y = unitPositions[i * 3 + 1],
        z = unitPositions[i * 3 + 2],
        r = 1;
      const theta = Math.atan2(z, x),
        phi = Math.acos(Math.max(-1, Math.min(1, y / 1.34))),
        yn = y / 1.34;
      if (index === 1) r = 1 - 0.1 * yn + 0.045 * Math.cos(phi * 2);
      if (index === 2)
        r = 1 + 0.18 * Math.cos(theta * 5) * Math.pow(Math.sin(phi), 2);
      if (index === 3) r = 1 + 0.06 * Math.max(0, yn);
      if (index === 4) r = 1 - 0.035 * yn;
      if (index === 5) r = 1 + 0.025 * yn;
      if (index === 6) r = 1 - 0.1 * yn;
      if (index === 7) r = 1 + 0.12 * yn;
      if (index === 8) r = 1 + 0.25 * yn;
      if (index === 9) r = 1 + 0.1 * yn;
      a.setXYZ(i, x * r, y * r * (index === 9 ? 0.82 : 1), z * r);
    }
    a.needsUpdate = true;
    geometry.computeVertexNormals();
    basePositions = a.array.slice();
    velocities.fill(0);
    pressDepthTargets.fill(0);
    blob.children
      .filter((o) => o.userData.shapeAccessory)
      .forEach((o) => removeMesh(o));
    if (duckBeak) duckBeak.visible = index === 7;
    const add = (mesh, x, y, z, scale = [1, 1, 1]) => {
      mesh.position.set(x, y, z);
      mesh.scale.set(...scale);
      mesh.userData.shapeAccessory = true;
      blob.add(mesh);
    };
    const earMat = new THREE.MeshPhysicalMaterial({
      color: colors[baseColorIndex].hex,
      roughness: 0.35,
      clearcoat: 0.4,
    });
    if ([3, 5].includes(index)) {
      const cfg =
        index === 3
          ? { x: 0.58, y: 1.14, r: 0.3, h: 1.22 }
          : { x: 0.76, y: 0.92, r: 0.25, h: 0.8 };
      for (const sign of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.SphereGeometry(cfg.r, 24, 18),
          earMat,
        );
        add(ear, sign * cfg.x, cfg.y, 0, [0.72, cfg.h, 0.55]);
      }
    }
    if (index === 4) {
      const innerEarMat = new THREE.MeshStandardMaterial({
        color: 0xff9fb8,
        roughness: 0.48,
      });
      for (const sign of [-1, 1]) {
        const tilt = -sign * 0.14,
          ear = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 22), earMat);
        add(ear, sign * 0.43, 1.69, 0.015, [0.19, 0.56, 0.12]);
        ear.rotation.z = tilt;
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(1, 24, 18),
          innerEarMat,
        );
        add(inner, sign * 0.43, 1.72, 0.126, [0.095, 0.37, 0.025]);
        inner.rotation.z = tilt;
      }
    }
    if (index === 6) {
      for (const x of [-0.46, 0.46]) {
        const bump = new THREE.Mesh(
          new THREE.SphereGeometry(0.27, 24, 18),
          earMat,
        );
        add(bump, x, 0.93, 0.53);
        const eyeWhite = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 18, 14),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        add(eyeWhite, x, 0.97, 0.76);
        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 14, 12),
          new THREE.MeshBasicMaterial({ color: 0x49394a }),
        );
        add(pupil, x, 0.97, 0.86);
      }
    }
    if (index === 1 || index === 8) {
      const stem = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x69b774 }),
      );
      add(stem, 0.06, 1.27, 0, [0.45, 1.2, 0.42]);
      if (index === 8) {
        stem.userData.deformWithBody = true;
        const seedMat = new THREE.MeshBasicMaterial({ color: 0xffefb6 });
        for (const y of [0.57, 0.22, -0.15, -0.52])
          for (const x of [-0.38, -0.12, 0.14, 0.4]) {
            if (Math.abs(x) + Math.abs(y) < 0.82) {
              const a = 0.25 / 1.34,
                y0 = (Math.sqrt(1 + 4 * a * y) - 1) / (2 * a),
                r = 1 + a * y0,
                surfaceZ = Math.sqrt(
                  Math.max(0.01, Math.pow(1.34 * r, 2) - x * x - y * y),
                ),
                seed = new THREE.Mesh(
                  new THREE.SphereGeometry(0.03, 10, 8),
                  seedMat,
                );
              add(seed, x, y, surfaceZ + 0.025, [1, 1.2, 0.72]);
              seed.userData.deformWithBody = true;
            }
          }
      }
    }
    rebuildFaceBindings();
    rebuildSurfaceBindings();
    document
      .querySelectorAll(".shape")
      .forEach((b) =>
        b.classList.toggle("selected", Number(b.dataset.i) === index),
      );
  }
  function rebuildFaceBindings() {
    if (!faceGroup || !basePositions) return;
    const count = geometry.attributes.position.count;
    faceBindings = faceGroup.children.map((mesh) => {
      const rest =
          mesh.userData.faceRestPosition ||
          (mesh.userData.faceRestPosition = mesh.position.clone()),
        nearest = [];
      for (let i = 0; i < count; i++) {
        const dx = basePositions[i * 3] - rest.x,
          dy = basePositions[i * 3 + 1] - rest.y,
          dz = basePositions[i * 3 + 2] - rest.z,
          d2 = dx * dx + dy * dy + dz * dz;
        if (nearest.length < 24) nearest.push({ i, d2 });
        else {
          let far = 0;
          for (let j = 1; j < nearest.length; j++)
            if (nearest[j].d2 > nearest[far].d2) far = j;
          if (d2 < nearest[far].d2) nearest[far] = { i, d2 };
        }
      }
      const sum = nearest.reduce((n, v) => n + 1 / (v.d2 + 0.004), 0);
      return {
        mesh,
        rest,
        scale: mesh.scale.clone(),
        normal: rest.clone().normalize(),
        nearest: nearest.map((v) => ({ i: v.i, w: 1 / (v.d2 + 0.004) / sum })),
      };
    });
  }
  function updateFaceDeformation() {
    const p = geometry.attributes.position;
    for (const binding of faceBindings) {
      let x = 0,
        y = 0,
        z = 0;
      for (const item of binding.nearest) {
        const i = item.i,
          k = i * 3,
          w = item.w;
        x += (p.array[k] - basePositions[k]) * w;
        y += (p.array[k + 1] - basePositions[k + 1]) * w;
        z += (p.array[k + 2] - basePositions[k + 2]) * w;
      }
      binding.mesh.position.set(
        binding.rest.x + x,
        binding.rest.y + y,
        binding.rest.z + z,
      );
      const squeeze = Math.min(
        0.48,
        Math.max(
          0,
          -(x * binding.normal.x + y * binding.normal.y + z * binding.normal.z),
        ),
      );
      binding.mesh.scale.set(
        binding.scale.x * (1 - squeeze * 0.28),
        binding.scale.y * (1 - squeeze * 0.58),
        binding.scale.z * (1 - squeeze * 0.2),
      );
    }
  }
  function rebuildSurfaceBindings() {
    if (!blob || !basePositions) return;
    const count = geometry.attributes.position.count;
    surfaceBindings = blob.children
      .filter((mesh) => mesh.userData.deformWithBody)
      .map((mesh) => {
        const rest =
            mesh.userData.surfaceRestPosition ||
            (mesh.userData.surfaceRestPosition = mesh.position.clone()),
          nearest = [];
        for (let i = 0; i < count; i++) {
          const dx = basePositions[i * 3] - rest.x,
            dy = basePositions[i * 3 + 1] - rest.y,
            dz = basePositions[i * 3 + 2] - rest.z,
            d2 = dx * dx + dy * dy + dz * dz;
          if (nearest.length < 24) nearest.push({ i, d2 });
          else {
            let far = 0;
            for (let j = 1; j < nearest.length; j++)
              if (nearest[j].d2 > nearest[far].d2) far = j;
            if (d2 < nearest[far].d2) nearest[far] = { i, d2 };
          }
        }
        const sum = nearest.reduce((n, v) => n + 1 / (v.d2 + 0.004), 0);
        return {
          mesh,
          rest,
          scale: mesh.scale.clone(),
          normal: rest.clone().normalize(),
          nearest: nearest.map((v) => ({
            i: v.i,
            w: 1 / (v.d2 + 0.004) / sum,
          })),
        };
      });
  }
  function updateSurfaceDeformation() {
    const p = geometry.attributes.position;
    for (const binding of surfaceBindings) {
      let x = 0,
        y = 0,
        z = 0;
      for (const item of binding.nearest) {
        const i = item.i,
          k = i * 3,
          w = item.w;
        x += (p.array[k] - basePositions[k]) * w;
        y += (p.array[k + 1] - basePositions[k + 1]) * w;
        z += (p.array[k + 2] - basePositions[k + 2]) * w;
      }
      binding.mesh.position.set(
        binding.rest.x + x,
        binding.rest.y + y,
        binding.rest.z + z,
      );
      const squeeze = Math.min(
        0.62,
        Math.max(
          0,
          -(x * binding.normal.x + y * binding.normal.y + z * binding.normal.z),
        ),
      );
      binding.mesh.scale.set(
        binding.scale.x * (1 - squeeze * 0.2),
        binding.scale.y * (1 - squeeze * 0.3),
        binding.scale.z * (1 - squeeze * 0.8),
      );
    }
  }
  function hitAt(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(blob, false)[0];
  }
  function onDown(e) {
    if (adventure.mode || !active || !e.isPrimary || e.button !== 0) return;
    pointerDown = true;
    stage.setPointerCapture?.(e.pointerId);
    lastPointer = { x: e.clientX, y: e.clientY };
    const hit = hitAt(e);
    if (hit) {
      if (tool === "squish") {
        pressDepthTargets.fill(0);
        squish(hit);
        playSquishSound();
      }
      if (tool === "paint") paint(hit);
      if (tool === "sticker")
        addSticker(stickerChoice, blob.worldToLocal(hit.point.clone()));
    }
  }
  function onMove(e) {
    if (adventure.mode || !pointerDown) return;
    if (tool === "orbit" && lastPointer) {
      blob.rotation.y += (e.clientX - lastPointer.x) * 0.008;
      blob.rotation.x += (e.clientY - lastPointer.y) * 0.006;
    }
    lastPointer = { x: e.clientX, y: e.clientY };
    if (tool === "paint") {
      const hit = hitAt(e);
      if (hit) paint(hit);
    } else if (tool === "squish") {
      const hit = hitAt(e);
      if (hit) {
        squish(hit);
        const soundGap = state.slangi
          ? state.slangiSound === "icloud"
            ? 520
            : 560
          : 190;
        if (performance.now() - lastSoundAt > soundGap) playSquishSound();
      }
    }
  }
  function applyPeek() {
    const visible = peekInside;
    blob.material.transparent = visible || state.slangi;
    blob.material.opacity = visible ? 0.42 : state.slangi ? 0.82 : 1;
    blob.material.depthWrite = !visible && !state.slangi;
    blob.material.needsUpdate = true;
    document.querySelector("#peek").textContent = peekInside
      ? "🙈 속 닫기"
      : "👀 속 보기";
    document
      .querySelector("#peek")
      .setAttribute("aria-pressed", String(peekInside));
  }
  function setPeek(show) {
    peekInside = show;
    blob.children
      .filter((o) => o.userData.crunch)
      .forEach((o) => (o.visible = show));
    applyPeek();
  }
  function setSlangi(enabled) {
    state.slangi = enabled;
    setPeek(false);
    const m = blob.material;
    m.color.set(enabled ? 0xd7f8f4 : 0xffffff);
    m.roughness = enabled ? 0.16 : 0.27;
    m.clearcoat = enabled ? 0.95 : 0.55;
    m.clearcoatRoughness = enabled ? 0.08 : 0.19;
    m.needsUpdate = true;
    document
      .querySelector("#slangi-toggle")
      .classList.toggle("selected", enabled);
    document
      .querySelector("#slangi-toggle")
      .setAttribute("aria-pressed", String(enabled));
    document
      .querySelector("#malangyi-toggle")
      .classList.toggle("selected", !enabled);
    document
      .querySelector("#malangyi-toggle")
      .setAttribute("aria-pressed", String(!enabled));
    applyPeek();
    updateSlangiSoundButtons();
    document.querySelector("#hint").textContent = enabled
      ? "슬랑이 모드! 말랑이 전체가 말캉한 슬라임처럼 반짝여요 🫧"
      : "말랑이 모드예요. 속 재료를 추가하거나 속 보기를 눌러 확인해 보세요 ✨";
  }
  function getNoiseSample(ctx) {
    if (noiseSample && noiseSample.sampleRate === ctx.sampleRate)
      return noiseSample;
    const length = Math.ceil(ctx.sampleRate * 0.6);
    noiseSample = ctx.createBuffer(1, length, ctx.sampleRate);
    const a = noiseSample.getChannelData(0);
    for (let i = 0; i < length; i++) a[i] = Math.random() * 2 - 1;
    return noiseSample;
  }
  function burstBuffer(ctx, kind) {
    const duration =
        kind === "slime"
          ? 0.58
          : kind === "putty"
            ? 0.22
            : kind === "icloud"
              ? 0.52
              : 0.34,
      n = Math.ceil(ctx.sampleRate * duration),
      buffer = ctx.createBuffer(1, n, ctx.sampleRate),
      out = buffer.getChannelData(0),
      source = getNoiseSample(ctx).getChannelData(0);
    if (kind === "slime") {
      let smooth = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n,
          env = Math.sin(Math.PI * t),
          slowWaver = 0.7 + 0.3 * Math.sin(t * Math.PI * 4);
        smooth = smooth * 0.82 + source[i % source.length] * 0.18;
        out[i] = smooth * env * 0.13 * slowWaver;
      }
    } else if (kind === "putty") {
      /* Putty is intentionally nearly silent; avoid hiss and crunchy noise. */
    } else if (kind === "icloud") {
      let smooth = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n,
          env = Math.pow(Math.sin(Math.PI * t), 0.72);
        smooth = smooth * 0.35 + source[i % source.length] * 0.65;
        out[i] = smooth * env * 0.46;
      }
    } else {
      const pops = kind === "rainbow" ? 36 : 20;
      for (let p = 0; p < pops; p++) {
        const start = Math.floor(Math.random() * n),
          len = Math.floor(
            ctx.sampleRate *
              (kind === "rainbow"
                ? 0.003 + Math.random() * 0.012
                : 0.006 + Math.random() * 0.02),
          ),
          amp =
            (kind === "rainbow" ? 0.28 : 0.42) * (0.35 + Math.random() * 0.65);
        for (let j = 0; j < len && start + j < n; j++) {
          const env = Math.exp(-j / (len * 0.24));
          out[start + j] += source[(start + j) % source.length] * env * amp;
        }
      }
      for (let i = 0; i < n; i++)
        out[i] +=
          source[i % source.length] *
          (kind === "rainbow" ? 0.022 : 0.035) *
          (1 - i / n);
    }
    return buffer;
  }
  function playSquishSound() {
    if (!soundEnabled) return;
    lastSoundAt = performance.now();
    if (state.slangi && state.slangiSound === "putty") return;
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContext;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const list = state.crunch || [],
        count = list.length,
        kindSlangi = state.slangi
          ? state.slangiSound === "icloud"
            ? "icloud"
            : "putty"
          : null,
        weights = kindSlangi
          ? { [kindSlangi]: 1 }
          : count
            ? {
                rainbow:
                  list.filter((x) => x.kind === "rainbow").length / count,
                choco: list.filter((x) => x.kind === "choco").length / count,
                slime: list.filter((x) => x.kind === "slime").length / count,
              }
            : { soft: 1 };
      for (const [kind, weight] of Object.entries(weights)) {
        if (!weight || kind === "putty") continue;
        const src = ctx.createBufferSource();
        src.buffer = burstBuffer(ctx, kind);
        const filter = ctx.createBiquadFilter(),
          body = ctx.createBiquadFilter(),
          gain = ctx.createGain();
        filter.type =
          kind === "slime"
            ? "bandpass"
            : kind === "icloud"
              ? "bandpass"
              : kind === "rainbow"
                ? "highpass"
                : "lowpass";
        filter.frequency.value =
          kind === "slime"
            ? 2300
            : kind === "icloud"
              ? 450
              : kind === "rainbow"
                ? 1050
                : 2600;
        filter.Q.value = kind === "slime" ? 0.42 : kind === "icloud" ? 0.2 : 1;
        body.type =
          kind === "slime" || kind === "putty" || kind === "icloud"
            ? "lowpass"
            : "peaking";
        body.frequency.value =
          kind === "slime"
            ? 6200
            : kind === "putty"
              ? 500
              : kind === "icloud"
                ? 4800
                : kind === "rainbow"
                  ? 3800
                  : 1150;
        body.Q.value = 0.7;
        body.gain.value = kind === "choco" ? 2.5 : 1;
        const duration =
            kind === "soft"
              ? 0.25
              : kind === "slime"
                ? 0.58
                : kind === "putty"
                  ? 0.22
                  : kind === "icloud"
                    ? 0.52
                    : 0.34,
          volume =
            kind === "choco"
              ? 0.4
              : kind === "rainbow"
                ? 0.34
                : kind === "slime"
                  ? 0.15
                  : kind === "putty"
                    ? 0.012
                    : kind === "icloud"
                      ? 0.4
                      : 0.24;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(
          volume * weight,
          now + (kind === "icloud" ? 0.025 : 0.05),
        );
        gain.gain.setValueAtTime(volume * weight, now + duration * 0.52);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        if (kind === "icloud") {
          filter.frequency.setValueAtTime(350, now);
          filter.frequency.linearRampToValueAtTime(2600, now + duration * 0.64);
          filter.frequency.linearRampToValueAtTime(900, now + duration);
        }
        src
          .connect(filter)
          .connect(body)
          .connect(gain)
          .connect(ctx.destination);
        src.start(now);
        src.stop(now + duration);
      }
    } catch (err) {
      console.warn("Audio playback unavailable", err);
    }
  }
  function squish(hit) {
    const local = blob.worldToLocal(hit.point.clone()),
      puttyMode = state.slangi && state.slangiSound === "putty",
      radius = puttyMode ? 1 : state.slangi ? 0.88 : 0.78,
      maxDepth = puttyMode ? 0.58 : state.slangi ? 0.36 : 0.3;
    for (let i = 0; i < pressDepthTargets.length; i++) {
      const k = i * 3,
        bx = basePositions[k],
        by = basePositions[k + 1],
        bz = basePositions[k + 2],
        d = Math.hypot(bx - local.x, by - local.y, bz - local.z);
      let target = 0;
      if (d < radius) {
        const u = 1 - d / radius;
        target = maxDepth * u * u * (3 - 2 * u);
      } else if (d < radius + 0.2) {
        target = -0.025 * Math.sin((Math.PI * (d - radius)) / 0.2);
      }
      if (Math.abs(target) > Math.abs(pressDepthTargets[i]))
        pressDepthTargets[i] = target;
    }
    document.querySelector("#hint").textContent = state.slangi
      ? "꾹 누르면 꾸덕하게 천천히 들어가고, 놓으면 느긋하게 돌아와요 🍯"
      : "꾹꾹! 부드럽게 눌려요. 놓으면 천천히 돌아와요 ✨";
  }
  function paint(hit, record = true) {
    const local = blob.worldToLocal(hit.point.clone()),
      p = geometry.attributes.position,
      c = paintAttribute,
      color = new THREE.Color(colors[colorIndex].hex);
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(
        p.getX(i) - local.x,
        p.getY(i) - local.y,
        p.getZ(i) - local.z,
      );
      if (d < 0.42) {
        const f = (1 - d / 0.42) * 0.88,
          old = new THREE.Color(c.getX(i), c.getY(i), c.getZ(i));
        old.lerp(color, f);
        c.setXYZ(i, old.r, old.g, old.b);
      }
    }
    c.needsUpdate = true;
    if (state.paint.length >= 1800) {
      document.querySelector("#hint").textContent =
        "색칠이 가득해요! 다른 도구로 더 꾸며 봐요.";
      return;
    }
    if (record)
      state.paint.push({
        x: local.x,
        y: local.y,
        z: local.z,
        color: colors[colorIndex].hex,
      });
    document.querySelector("#hint").textContent =
      "슥슥 색칠 중! 원하는 곳을 톡톡 칠해요 🎨";
  }
  function loadPaint(dabs) {
    const base = new THREE.Color(colors[baseColorIndex].hex),
      p = geometry.attributes.position,
      c = paintAttribute;
    for (let i = 0; i < p.count; i++) c.setXYZ(i, base.r, base.g, base.b);
    if (shapeIndex === 9) {
      const glaze = new THREE.Color("#a95f35"),
        shine = new THREE.Color("#d8904e");
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y > 0.91) {
          const t = Math.max(0, Math.min(1, (y - 0.91) / 0.3)),
            tone = glaze.clone().lerp(shine, t * 0.45),
            old = new THREE.Color(c.getX(i), c.getY(i), c.getZ(i));
          old.lerp(tone, Math.min(1, t * 1.35));
          c.setXYZ(i, old.r, old.g, old.b);
        }
      }
    }
    for (const d of dabs) {
      const pos = new THREE.Vector3(d.x, d.y, d.z),
        color = new THREE.Color(d.color);
      for (let i = 0; i < p.count; i++) {
        const dist = Math.hypot(
          p.getX(i) - pos.x,
          p.getY(i) - pos.y,
          p.getZ(i) - pos.z,
        );
        if (dist < 0.42) {
          const f = (1 - dist / 0.42) * 0.88,
            old = new THREE.Color(c.getX(i), c.getY(i), c.getZ(i));
          old.lerp(color, f);
          c.setXYZ(i, old.r, old.g, old.b);
        }
      }
    }
    c.needsUpdate = true;
  }
  function addSticker(emoji, pos, record = true) {
    if (record && state.stickers.length >= 60) return;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.font = "92px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 64, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      }),
    );
    const normal = pos.clone().normalize();
    sprite.position.copy(pos).addScaledVector(normal, 0.045);
    sprite.scale.set(0.31, 0.31, 1);
    sprite.renderOrder = 2;
    blob.add(sprite);
    if (record) state.stickers.push({ emoji, x: pos.x, y: pos.y, z: pos.z });
  }
  function loadStickers(items) {
    blob.children.filter((o) => o.isSprite).forEach((o) => removeMesh(o));
    for (const item of items)
      addSticker(item.emoji, new THREE.Vector3(item.x, item.y, item.z), false);
  }
  function addCrunchBatch() {
    if (state.slangi) {
      document.querySelector("#hint").textContent =
        "슬랑이는 말랑이 전체가 슬라임이에요. 속 재료는 말랑이 모드에서 넣어 보세요 🫧";
      return;
    }
    const list = state.crunch || [];
    if (list.length >= 150) {
      document.querySelector("#hint").textContent =
        "말랑이 속이 꽉 찼어요! 최대 150개까지 넣을 수 있어요";
      return;
    }
    for (let n = 0; n < 10 && list.length < 150; n++) {
      let v;
      do {
        v = new THREE.Vector3(
          (Math.random() - 0.5) * 1.3,
          (Math.random() - 0.5) * 1.45,
          (Math.random() - 0.5) * 1.1,
        );
      } while (v.length() > 0.72);
      list.push({
        x: v.x,
        y: v.y,
        z: v.z,
        kind: crunchKind,
        hue: Math.random(),
      });
    }
    state.crunch = list;
    loadCrunch(list);
    document.querySelector("#hint").textContent =
      crunchKind === "slime"
        ? "샤베트 슬라임을 말랑이 속에 쏙 넣었어요! 누르면 부드럽게 사르륵 소리가 나요 🍧"
        : "크런치를 한 줌 넣었어요! 속을 열어 확인해 봐요 🥣";
  }
  function loadCrunch(list) {
    blob.children
      .filter((o) => o.userData.crunch)
      .forEach((o) => removeMesh(o));
    for (const bit of list) {
      const slime = bit.kind === "slime";
      const color = slime
        ? new THREE.Color().setHSL(0.52 + bit.hue * 0.12, 0.75, 0.72)
        : bit.kind === "choco"
          ? [0x6b392b, 0x9a5b3c, 0xd39a5d][Math.floor(bit.hue * 3)]
          : new THREE.Color().setHSL(bit.hue, 0.8, 0.58);
      const size = slime ? 0.17 : 0.095,
        geo = slime
          ? new THREE.SphereGeometry(size, 20, 16)
          : bit.kind === "choco"
            ? new THREE.DodecahedronGeometry(size, 0)
            : new THREE.IcosahedronGeometry(size, 0);
      const mat = slime
        ? new THREE.MeshPhysicalMaterial({
            color,
            transparent: true,
            opacity: 0.68,
            roughness: 0.12,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            depthWrite: false,
          })
        : new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(bit.x, bit.y, bit.z);
      mesh.scale.set(slime ? 1.25 : 1, slime ? 0.78 : 1, slime ? 0.9 : 1);
      mesh.rotation.set(bit.hue * 6, bit.hue * 3, bit.hue * 4);
      mesh.userData.crunch = true;
      mesh.visible = peekInside;
      blob.add(mesh);
    }
    document.querySelector("#fill-count").textContent = `${list.length}개`;
  }
  function onTools() {
    document.querySelectorAll("[data-tool]").forEach(
      (b) =>
        (b.onclick = () => {
          tool = b.dataset.tool;
          document
            .querySelectorAll("[data-tool]")
            .forEach((x) => x.classList.toggle("selected", x === b));
          const hints = {
            squish: "말랑이를 꾹 누르거나 문질러 푹 눌러 봐요",
            orbit: "말랑이를 드래그해 돌려 봐요. 얼굴도 함께 따라가요",
            paint: "색을 고른 뒤 말랑이 위를 쓱쓱 문질러요",
            sticker: "스티커를 고르고 말랑이를 톡 눌러 붙여요",
          };
          document.querySelector("#hint").textContent = hints[tool];
        }),
    );
  }
  function updateColors() {
    document.querySelector("#colors").innerHTML = colors
      .map(
        (c, i) =>
          `<button class="color ${i === colorIndex ? "selected" : ""}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name} 색" data-i="${i}"></button>`,
      )
      .join("");
    document.querySelectorAll(".color").forEach(
      (b) =>
        (b.onclick = () => {
          colorIndex = Number(b.dataset.i);
          if (tool !== "paint") {
            baseColorIndex = colorIndex;
            state.baseColorIndex = baseColorIndex;
            loadPaint(state.paint || []);
            setShape(shapeIndex);
          }
          updateColors();
        }),
    );
  }
  function applyFace() {
    if (!faceGroup) return;
    eyes.forEach((e) => (e.scale.y = faceIndex === 2 ? 0.38 : 1));
    mouth.scale.set(
      faceIndex === 1 ? 1.25 : faceIndex === 2 ? 0.7 : 1,
      faceIndex === 1 ? 1.3 : faceIndex === 2 ? 0.7 : 1,
      1,
    );
    mouth.rotation.z = faceIndex === 3 ? Math.PI + 0.22 : Math.PI;
    faceGroup.scale.setScalar(faceIndex === 2 ? 0.94 : 1);
    rebuildFaceBindings();
  }
  function updateFaces() {
    document.querySelector("#faces").innerHTML = expressions
      .map(
        (f, i) =>
          `<button class="face ${i === faceIndex ? "selected" : ""}" aria-label="표정 ${i + 1}" data-i="${i}">${f}</button>`,
      )
      .join("");
    document.querySelectorAll(".face").forEach(
      (b) =>
        (b.onclick = () => {
          faceIndex = Number(b.dataset.i);
          document
            .querySelectorAll(".face")
            .forEach((x) => x.classList.toggle("selected", x === b));
          applyFace();
        }),
    );
    applyFace();
  }
  function persistDraft() {
    state = {
      ...state,
      slangi: Boolean(state.slangi),
      slangiSound: state.slangiSound || "putty",
      name: document.querySelector("#name").value,
      colorIndex,
      baseColorIndex,
      faceIndex,
      shapeIndex,
    };
    workshopStorage.setItem("malang-draft", JSON.stringify(state));
  }
  function renderGallery() {
    const list = JSON.parse(workshopStorage.getItem("malang-gallery") || "[]");
    document.querySelector("#gallery").innerHTML = list.length
      ? list
          .map(
            (x, i) =>
              `<button class="saved-card" data-i="${i}"><span>${shapes[x.shapeIndex]?.emoji || "🟠"} ${expressions[x.faceIndex] || "😊"}</span><span>${escapeHtml(x.name || "이름 없는 친구")}</span></button>`,
          )
          .join("")
      : '<span style="font-size:12px;color:#aaa4b6">아직 저장한 친구가 없어요.</span>';
    document
      .querySelectorAll(".saved-card")
      .forEach(
        (b) => (b.onclick = () => loadCreation(list[Number(b.dataset.i)])),
      );
    refreshAdventureHeroes();
  }
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function loadCreation(x) {
    state = { ...structuredClone(x), slangiSound: x.slangiSound || "putty" };
    colorIndex = x.colorIndex;
    baseColorIndex = x.baseColorIndex ?? x.colorIndex;
    faceIndex = x.faceIndex;
    shapeIndex = x.shapeIndex;
    document.querySelector("#name").value = x.name || "";
    setShape(shapeIndex);
    loadPaint(x.paint || []);
    state.paint = [...(x.paint || [])];
    loadStickers(x.stickers || []);
    state.stickers = [...(x.stickers || [])];
    loadCrunch(x.crunch || []);
    state.crunch = [...(x.crunch || [])];
    setSlangi(Boolean(x.slangi));
    updateSlangiSoundButtons();
    updateColors();
    updateFaces();
  }
  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!active || document.hidden) return;
    const t = clock.getElapsedTime(),
      p = geometry.attributes.position,
      puttyMode = state.slangi && state.slangiSound === "putty",
      spring = state.slangi ? 0.018 : 0.055,
      damping = state.slangi ? 0.94 : 0.9;
    for (let i = 0; i < p.count; i++) {
      const k = i * 3,
        depth = pressDepthTargets[i],
        nx = basePositions[k] / 1.34,
        ny = basePositions[k + 1] / 1.34,
        nz = basePositions[k + 2] / 1.34,
        tx = basePositions[k] - nx * depth,
        ty = basePositions[k + 1] - ny * depth,
        tz = basePositions[k + 2] - nz * depth;
      for (let a = 0; a < 3; a++) {
        const target = a === 0 ? tx : a === 1 ? ty : tz;
        if (puttyMode) {
          p.array[k + a] += (target - p.array[k + a]) * 0.014;
          velocities[k + a] = 0;
        } else {
          velocities[k + a] += (target - p.array[k + a]) * spring;
          velocities[k + a] *= damping;
          p.array[k + a] += velocities[k + a];
        }
      }
    }
    p.needsUpdate = true;
    if (pointerDown || t - lastNormals > 0.06) {
      geometry.computeVertexNormals();
      lastNormals = t;
    }
    updateFaceDeformation();
    updateSurfaceDeformation();
    blob.position.y = save.settings.reducedMotion
      ? 0
      : Math.sin(t * 1.4) * 0.045;
    renderer.render(scene, camera);
  }
  document.querySelector("#shapes").innerHTML = shapes
    .map(
      (s, i) =>
        `<button class="shape ${i === shapeIndex ? "selected" : ""}" data-i="${i}">${s.emoji} ${s.name}</button>`,
    )
    .join("");
  document.querySelectorAll(".shape").forEach(
    (b) =>
      (b.onclick = () => {
        setShape(Number(b.dataset.i));
        loadPaint(state.paint || []);
        document.querySelector("#hint").textContent =
          "새 모양을 골랐어요! 더 꾸며 볼까요? ✨";
      }),
  );
  document.querySelector("#stickers").innerHTML = stickerChoices
    .map(
      (s) =>
        `<button class="sticker ${s === stickerChoice ? "selected" : ""}" data-s="${s}">${s}</button>`,
    )
    .join("");
  document.querySelectorAll(".sticker").forEach(
    (b) =>
      (b.onclick = () => {
        stickerChoice = b.dataset.s;
        document
          .querySelectorAll(".sticker")
          .forEach((x) => x.classList.toggle("selected", x === b));
        tool = "sticker";
        document
          .querySelectorAll("[data-tool]")
          .forEach((x) =>
            x.classList.toggle("selected", x.dataset.tool === "sticker"),
          );
        document.querySelector("#hint").textContent =
          "스티커를 고르고 말랑이를 톡 눌러 붙여요";
      }),
  );
  document.querySelector("#name").value = state.name || "";
  onTools();
  updateColors();
  updateFaces();
  renderGallery();
  document.querySelectorAll("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        crunchKind = b.dataset.kind;
        document
          .querySelectorAll("[data-kind]")
          .forEach((x) => x.classList.toggle("selected", x === b));
      }),
  );
  document.querySelector("#add-crunch").onclick = addCrunchBatch;
  document.querySelector("#malangyi-toggle").onclick = () => setSlangi(false);
  document.querySelector("#slangi-toggle").onclick = () => setSlangi(true);
  function updateSlangiSoundButtons() {
    document
      .querySelectorAll("[data-slangi-sound]")
      .forEach((b) =>
        b.classList.toggle(
          "selected",
          Boolean(state.slangi) &&
            b.dataset.slangiSound === (state.slangiSound || "putty"),
        ),
      );
  }
  document.querySelectorAll("[data-slangi-sound]").forEach(
    (b) =>
      (b.onclick = () => {
        state.slangiSound = b.dataset.slangiSound;
        setSlangi(true);
        updateSlangiSoundButtons();
        document.querySelector("#hint").textContent =
          b.dataset.slangiSound === "icloud"
            ? "아이클레이 쫀득 소리로 바꿨어요 ☁️"
            : "퍼티는 거의 무음으로 바꿨어요 🍯";
      }),
  );
  updateSlangiSoundButtons();
  document.querySelector("#sound-toggle").onclick = () => {
    soundEnabled = !soundEnabled;
    save.settings.sound = soundEnabled;
    persist();
    const b = document.querySelector("#sound-toggle");
    b.textContent = soundEnabled ? "🔊 소리 켜짐" : "🔇 소리 꺼짐";
    b.setAttribute("aria-pressed", String(soundEnabled));
  };
  document.querySelector("#peek").onclick = () => {
    if (!state.crunch?.length) {
      document.querySelector("#hint").textContent =
        "먼저 샤베트 슬라임이나 크런치를 넣어 봐요!";
      return;
    }
    setPeek(!peekInside);
    document.querySelector("#hint").textContent = peekInside
      ? "속 재료가 보여요. 말랑이를 눌러 섞어 보세요!"
      : "속 재료를 다시 숨겼어요.";
  };
  document.querySelector("#save").onclick = () => {
    persistDraft();
    const list = JSON.parse(workshopStorage.getItem("malang-gallery") || "[]");
    list.unshift({
      ...state,
      name: document.querySelector("#name").value.trim() || "이름 없는 친구",
    });
    workshopStorage.setItem(
      "malang-gallery",
      JSON.stringify(list.slice(0, 20)),
    );
    renderGallery();
    const b = document.querySelector("#save");
    b.textContent = "저장했어요! 💖";
    setTimeout(() => (b.textContent = "💖 내 말랑이 저장"), 1500);
  };
  document.querySelector("#reset").onclick = () => {
    state = {
      name: "",
      colorIndex: 0,
      baseColorIndex: 0,
      faceIndex: 0,
      shapeIndex: 0,
      slangi: false,
      slangiSound: "putty",
      stickers: [],
      paint: [],
      crunch: [],
    };
    colorIndex = baseColorIndex = faceIndex = shapeIndex = 0;
    document.querySelector("#name").value = "";
    blob.rotation.set(0, 0, 0);
    setPeek(false);
    setSlangi(false);
    setShape(0);
    loadPaint([]);
    loadStickers([]);
    loadCrunch([]);
    updateSlangiSoundButtons();
    updateColors();
    updateFaces();
    document.querySelector("#hint").textContent =
      "새 도화지예요! 모양과 도구를 골라 시작해 봐요 ✨";
  };

  init();

  function syncSoundButton() {
    const button = document.querySelector("#sound-toggle");
    button.textContent = soundEnabled ? "🔊 소리 켜짐" : "🔇 소리 꺼짐";
    button.setAttribute("aria-pressed", String(soundEnabled));
  }
  syncSoundButton();
  function snapshot() {
    return structuredClone({
      ...state,
      name: document.querySelector("#name").value,
      colorIndex,
      baseColorIndex,
      faceIndex,
      shapeIndex,
    });
  }
  function checkpoint() {
    undoStack.push(snapshot());
    if (undoStack.length > 25) undoStack.shift();
  }
  const root = document.querySelector("#workshop-view");
  root.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.closest("#stage")) checkpoint();
    },
    true,
  );
  root.addEventListener(
    "click",
    (e) => {
      if (
        e.target.closest(
          ".shape,.color,.face,.sticker,.saved-card,#reset,#add-crunch,#slangi-toggle,#malangyi-toggle,[data-slangi-sound]",
        )
      )
        checkpoint();
    },
    true,
  );
  root.addEventListener("focusin", (e) => {
    if (e.target.id === "name") checkpoint();
  });
  const scheduleSave = () => {
    try {
      persistDraft();
    } catch {
      window.dispatchEvent(new CustomEvent("storage-error"));
    }
  };
  root.addEventListener("pointerup", scheduleSave);
  root.addEventListener("click", scheduleSave);
  root.addEventListener("input", scheduleSave);
  stage.addEventListener("pointercancel", () => {
    pointerDown = false;
    pressDepthTargets.fill(0);
  });
  const fail = () => {
    window.dispatchEvent(new CustomEvent("workshop-error"));
  };
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    active = false;
    fail();
  });
  return {
    snapshot,
    load(hero) {
      loadCreation(hero);
      scheduleSave();
    },
    undo() {
      const previous = undoStack.pop();
      if (previous) {
        loadCreation(previous);
        scheduleSave();
      }
      return !!previous;
    },
    setActive(value) {
      active = value;
      if (!value) scheduleSave();
      else renderGallery();
      soundEnabled = save.settings.sound;
      syncSoundButton();
    },
    dispose() {
      active = false;
      cancelAnimationFrame(frameId);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          for (const m of [o.material].flat()) {
            m.map?.dispose();
            m.dispose();
          }
      });
      renderer.dispose();
    },
  };
}
