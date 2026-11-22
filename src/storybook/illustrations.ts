import { COLORS, type Hero } from "../data";
import { STORY_PAGES } from "./pages";
// The art is native SVG: crisp at every screen size, with individually touchable details.
function blob(
  x: number,
  y: number,
  scale: number,
  color: string,
  shape = 0,
  face = 0,
  custom?: Hero["customization"],
  character?: Hero,
) {
  const ears =
    shape === 4
      ? '<ellipse cx="-19" cy="-46" rx="10" ry="31" transform="rotate(-9 -19 -46)"/><ellipse cx="19" cy="-46" rx="10" ry="31" transform="rotate(9 19 -46)"/>'
      : [3, 5, 6].includes(shape)
        ? '<ellipse cx="-27" cy="-31" rx="13" ry="16"/><ellipse cx="27" cy="-31" rx="13" ry="16"/>'
        : "";
  const body =
    shape === 2
      ? '<path d="M0-49 14-17 49-14 24 10 30 45 0 28-30 45-24 10-49-14-14-17Z"/>'
      : shape === 9
        ? '<path d="M-29-32Q0-43 29-32L42 26Q0 46-42 26Z"/>'
        : shape === 8
          ? '<path d="M-36-22Q0-55 36-22Q47 2 0 40Q-47 2-36-22Z"/>'
          : '<path d="M-40 15C-49-56 49-56 40 15Q44 45 0 38Q-43 45-40 15Z"/>';
  const eyes =
    face === 2
      ? '<path d="M-20-3q6 7 12 0M8-3q6 7 12 0" fill="none" stroke="#5c4b55" stroke-width="3" stroke-linecap="round"/>'
      : '<ellipse cx="-14" cy="-3" rx="3.4" ry="4.9" fill="#5c4b55"/><ellipse cx="14" cy="-3" rx="3.4" ry="4.9" fill="#5c4b55"/><circle cx="-15" cy="-5" r="1.3" fill="white"/><circle cx="13" cy="-5" r="1.3" fill="white"/>';
  const faceArt = `<g transform="translate(${(custom?.faceX ?? 0) * 24} ${-(custom?.faceY ?? 0) * 24}) scale(${custom?.faceScale ?? 1})"><g transform="scale(${custom?.eyeSpacing ?? 1} 1)">${eyes.replaceAll("#5c4b55", custom?.eyeColor ?? "#5c4b55")}</g><g opacity="${custom?.cheekOpacity ?? 0.52}"><ellipse cx="-25" cy="10" rx="7" ry="3.5" fill="#e895a9"/><ellipse cx="25" cy="10" rx="7" ry="3.5" fill="#e895a9"/></g><path d="M-6 11q6 10 12 0" fill="none" stroke="#86606a" stroke-width="2.5" stroke-linecap="round"/></g>`;
  const pattern =
    custom && custom.pattern !== "plain"
      ? `<defs><clipPath id="book-main-pattern">${body}</clipPath></defs><g clip-path="url(#book-main-pattern)" fill="${custom.patternColor}" opacity=".5">${custom.pattern === "dots" ? Array.from({ length: 35 }, (_, i) => `<circle cx="${-42 + (i % 7) * 14}" cy="${-35 + Math.floor(i / 7) * 16}" r="3.5"/>`).join("") : Array.from({ length: 8 }, (_, i) => `<rect x="-48" y="${-44 + i * 12}" width="96" height="${custom.pattern === "stripes" ? 4 : 10}" opacity="${custom.pattern === "gradient" ? 1 - i / 8 : 1}"/>`).join("")}</g>`
      : "";
  const paintArt =
    character?.paint
      .filter((dab, i) => dab.z > 0 && i % 4 === 0)
      .slice(-200)
      .map(
        (dab) =>
          `<circle cx="${dab.x * 26}" cy="${-dab.y * 26}" r="${(dab.radius ?? 0.42) * 11}" fill="${dab.color}" opacity=".32"/>`,
      )
      .join("") ?? "";
  const safe = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const decorations =
    character?.stickers
      .filter((s) => s.z > 0)
      .slice(0, 60)
      .map(
        (s) =>
          `<text transform="translate(${s.x * 26} ${-s.y * 26 + 6}) rotate(${-(s.rotation ?? 0)}) scale(${s.scale ?? 1})" text-anchor="middle" font-size="20">${safe(s.emoji)}</text>`,
      )
      .join("") ?? "";
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="39" rx="43" ry="7" fill="#786d6b15"/><g fill="${color}">${ears}${body}</g><ellipse cx="-16" cy="-22" rx="12" ry="4" fill="#ffffff70" transform="rotate(-25 -16 -22)"/>${pattern}${character ? `<defs><clipPath id="book-painted-body">${body}</clipPath></defs><g clip-path="url(#book-painted-body)">${paintArt}</g>` : ""}${faceArt}${decorations}${shape === 7 ? '<ellipse cx="0" cy="10" rx="10" ry="5" fill="#edb963"/>' : ""}${[1, 8].includes(shape) ? '<path d="M0-35q5-19 19-11Q12-31 0-35" fill="#9bb582"/>' : ""}</g>`;
}
const star = (x: number, y: number, r = 14, fill = "#ead18d") =>
  `<path d="M0-${r} ${r * 0.3}-${r * 0.32} ${r} 0 ${r * 0.3} ${r * 0.32} 0 ${r} -${r * 0.3} ${r * 0.32} -${r} 0 -${r * 0.3}-${r * 0.32}Z" transform="translate(${x} ${y})" fill="${fill}"/>`;
const cloud = (x: number, y: number, scale = 1) =>
  `<g transform="translate(${x} ${y}) scale(${scale})" fill="#fffdf4"><ellipse cx="0" cy="0" rx="43" ry="23"/><ellipse cx="38" cy="-14" rx="40" ry="34"/><ellipse cx="75" cy="0" rx="40" ry="23"/><rect x="0" y="-1" width="75" height="24"/></g>`;
const tree = (x: number, y: number, color = "#aebf9d", s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 2 90" stroke="#a89d7d" stroke-width="8"/><ellipse cx="0" cy="-8" rx="37" ry="54" fill="${color}"/><ellipse cx="-20" cy="14" rx="28" ry="34" fill="#d9e2bd99"/></g>`;
const flower = (x: number, y: number, color: string) =>
  `<g class="book-bloom" transform="translate(${x} ${y})"><path d="M0 0q-10 24 0 52" fill="none" stroke="#91aa7b" stroke-width="4"/><ellipse cx="-9" cy="31" rx="13" ry="5" transform="rotate(35 -9 31)" fill="#a9bd8a"/><g fill="${color}">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="-11" rx="8" ry="12" transform="rotate(${a})"/>`).join("")}</g><circle r="7" fill="#e7bd72"/></g>`;
const berry = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 20C-32 0-21-24 0-13C21-24 32 0 0 20" fill="#df93a7"/><path d="m-14-18 13 6 15-8-5 12-10-3-8 3Z" fill="#a6b78b"/><g fill="#fff2c1"><ellipse cx="-8" cy="0" rx="1.5" ry="2.2"/><ellipse cx="7" cy="-1" rx="1.5" ry="2.2"/><ellipse cy="10" rx="1.5" ry="2.2"/></g></g>`;
const rainbow = (colors: string[], opacity = 1) =>
  `<g opacity="${opacity}" fill="none" stroke-width="18" stroke-linecap="round">${colors.map((color, i) => `<path d="M${110 + i * 23} 292a${190 - i * 23} ${190 - i * 23} 0 0 1 ${380 - i * 46} 0" stroke="${color}"/>`).join("")}</g>`;
export function illustration(page: number, found: Set<string>, h: Hero) {
  const sceneId = STORY_PAGES[page].scene;
  const has = (id: string) => found.has(`${page}-${id}`),
    all = (ids: string[]) => ids.every(has),
    color = h.customization?.bodyColor || COLORS[h.baseColorIndex] || COLORS[1];
  const main = (x: number, y: number, s = 1) =>
    blob(x, y, s, color, h.shapeIndex, h.faceIndex, h.customization, h);
  const momo = (x: number, y: number, s = 0.7) => blob(x, y, s, "#c6d5a8", 6);
  const bunny = (x: number, y: number, s = 0.8) => blob(x, y, s, "#c9aed9", 4);
  const lulu = (x: number, y: number, s = 0.7) => blob(x, y, s, "#f2d796", 2);
  const friends = (y = 300) =>
    momo(165, y + 13) +
    main(280, y, 1.15) +
    bunny(399, y + 10) +
    lulu(466, y + 20, 0.6);
  const shared = `<defs><filter id="book-grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><linearGradient id="book-sky" x2="0" y2="1"><stop stop-color="${sceneId === 4 ? "#c6bfdb" : sceneId === 3 ? "#efd8dc" : sceneId === 5 ? "#cbded8" : "#e7eddc"}"/><stop offset="1" stop-color="#fff5dc"/></linearGradient></defs><rect width="600" height="440" fill="url(#book-sky)"/>`;
  let scene = "";
  if (sceneId === 0) {
    scene = `${rainbow(["#dfb2b6", "#ead8a5", "#bbcfaf", "#c8bad8"], 0.8)}${cloud(55, 110, 0.7)}${cloud(455, 166, 0.7)}<ellipse cx="300" cy="356" rx="224" ry="51" fill="#b6caa2"/><path d="M76 355q224 126 448 0" fill="#d5c6a7"/>${tree(112, 276, "#a8bf9b", 0.7)}${tree(495, 282, "#a8bf9b", 0.6)}${flower(173, 320, "#f4e5ad")}${flower(436, 329, "#e9b8c5")}<g class="${has("hello") ? "book-wiggle" : ""}">${main(313, 280, 1.65)}</g>${bunny(215, 310, 0.78)}${lulu(407, 319, 0.72)}${star(183, 160, 12, "#c9b2ce")}${star(440, 214, 9, "#bcceaa")}`;
  }
  if (sceneId === 1) {
    scene = `<circle cx="335" cy="118" r="35" fill="#f7e7b4"/>${rainbow(["#d2cfc4", "#d2cfc4", "#d2cfc4"], 0.2)}<path d="M0 312Q100 190 250 325Q430 225 600 298V440H0" fill="#c4d2b3"/><path d="M0 345Q180 282 340 338Q490 300 600 333V440H0" fill="#b2c49e"/>${main(307, 331, 1.08)}${flower(477, 345, "#efe6bb")}<ellipse cx="373" cy="355" rx="9" ry="5" fill="#e8d2a0"/>${has("cloud-left") ? star(220, 120, 11, "#f2cf7c") : `<g class="book-cloud">${cloud(127, 128, 1.1)}</g>`}${has("cloud-right") ? star(421, 163, 10, "#f2cf7c") : `<g class="book-cloud slow">${cloud(354, 165, 1.2)}</g>`}<path d="M273 340q12-55 37-53" fill="none" stroke="#9e8d75" stroke-width="4"/>`;
  }
  if (sceneId === 2) {
    scene = `${cloud(80, 82, 0.65)}${cloud(435, 116, 0.6)}<path d="M0 315Q170 232 345 305T600 275V440H0" fill="#c6d8af"/><path d="M0 355Q220 298 600 352V440H0" fill="#b4c99b"/>${tree(75, 210, "#bdcea9", 1.05)}${tree(534, 248, "#adc39c", 0.85)}${main(322, 295, 0.92)}${momo(238, 312, 0.75)}${[
      [144, 332, "flower-left", "#f4e5ac"],
      [305, 309, "flower-middle", "#e7b1c1"],
      [474, 337, "flower-right", "#fff9e6"],
    ]
      .map(([x, y, id, c]) =>
        has(String(id))
          ? flower(Number(x), Number(y) - 43, String(c))
          : `<g><ellipse cx="${x}" cy="${y}" rx="25" ry="9" fill="#9eaa8666"/><path d="M${x} ${y}q-6-14 7-19" stroke="#9bb382" stroke-width="4" fill="none"/></g>`,
      )
      .join("")}${star(375, 143, 10, "#e5d49a")}`;
  }
  if (sceneId === 3) {
    scene = `${cloud(88, 83, 0.7)}${tree(53, 187, "#c8bcbd", 1.4)}${tree(526, 193, "#b5c5a4", 1.35)}<path d="M0 350Q130 276 300 327T600 316V440H0" fill="#bcc9a7"/><path d="m167 314 257 0 55 97-367-9Z" fill="#f1d5cf"/><path d="m180 316-44 86m100-86-10 91m66-92 8 93m47-92 32 94m25-94 48 94" stroke="#ffffff60" stroke-width="10"/>${main(219, 272, 0.95)}${bunny(363, 267, 0.97)}${momo(453, 324, 0.65)}${[
      [237, 309, "berry-left"],
      [315, 329, "berry-middle"],
      [393, 309, "berry-right"],
    ]
      .map(([x, y, id]) =>
        has(String(id))
          ? star(Number(x), Number(y), 13, "#f5e3a0")
          : berry(Number(x), Number(y), 0.9),
      )
      .join(
        "",
      )}<path d="M110 366h45l-4 30h-35Z" fill="#c9a982"/><path d="M116 367q16-37 34 0" fill="none" stroke="#c9a982" stroke-width="5"/>`;
  }
  if (sceneId === 4) {
    const ids = ["star-left", "star-middle", "star-right"];
    scene = `<rect width="600" height="440" fill="#77748e" opacity=".28"/><circle cx="468" cy="79" r="26" fill="#fff2c9"/>${Array.from({ length: 20 }, (_, i) => star(25 + ((i * 139) % 555), 30 + ((i * 71) % 210), 2 + (i % 3), "#ffffff66")).join("")}${cloud(35, 350, 2.2)}${cloud(357, 366, 2)}${all(ids) ? '<path class="book-constellation" d="m162 136 138-44 150 62" fill="none" stroke="#f5e4b1" stroke-width="2.5" stroke-dasharray="5 7"/>' : ""}${[
      [162, 136, ids[0]],
      [300, 92, ids[1]],
      [450, 154, ids[2]],
    ]
      .map(
        ([x, y, id]) =>
          `<g class="${has(String(id)) ? "book-star-lit" : ""}">${has(String(id)) ? `<circle cx="${x}" cy="${y}" r="29" fill="#fff2c922"/>` : ""}${star(Number(x), Number(y), 18, has(String(id)) ? "#f9e5a1" : "#a7a3b7")}</g>`,
      )
      .join("")}${main(275, 315, 1.08)}${lulu(389, 317, 0.9)}`;
  }
  if (sceneId === 5) {
    scene = `<path d="M0 354q150-107 311-21t289-20v127H0" fill="#b0c2a4"/>${Array.from({ length: 16 }, (_, i) => `<path d="m${25 + i * 37} ${18 + ((i * 53) % 240)}-4 13" stroke="#91b4b6" opacity=".3" stroke-width="2" stroke-linecap="round"/>`).join("")}<path d="M120 279Q178 107 456 269Q280 335 120 279Z" fill="#9fba91"/><path d="M124 279q130-42 315-20" stroke="#c8d9b5" stroke-width="4" fill="none"/>${friends(337)}${[
      [150, 150, "drop-left", "#bad1a9"],
      [306, 115, "drop-middle", "#dfb1c2"],
      [462, 165, "drop-right", "#c6b2dd"],
    ]
      .map(
        ([x, y, id, c]) =>
          `<g class="${has(String(id)) ? "book-drop-reveal" : ""}" transform="translate(${x} ${y})"><path d="M0-25C-34 6-18 27 0 27S34 6 0-25" fill="${has(String(id)) ? c : "#dae8e6"}" stroke="#f4fbef" stroke-width="1.5"/>${has(String(id)) ? star(0, 4, 10, "#fff8df") : '<path d="M-9 6q-2 8 3 11" stroke="#fff9" stroke-width="3" fill="none" stroke-linecap="round"/>'}</g>`,
      )
      .join("")}`;
  }
  if (sceneId === 6) {
    const ids = ["rainbow-green", "rainbow-pink", "rainbow-purple"],
      colors = ["#bed0ac", "#e2b0be", "#b9a8d0"];
    scene = `${rainbow(
      colors.map((c, i) => (has(ids[i]) ? c : "#dcd9ce")),
      0.9,
    )}${cloud(83, 246, 0.7)}${cloud(460, 248, 0.7)}<path d="M0 343q170-77 323-5t277-8v110H0" fill="#c2d0ac"/>${main(301, 280, 0.95)}${momo(204, 295, 0.67)}${bunny(393, 291, 0.72)}${ids.map((id, i) => `<g transform="translate(${168 + i * 138} 360)"><circle r="22" fill="${colors[i]}" opacity="${has(id) ? ".4" : ".9"}"/>${has(id) ? '<path d="m-7 0 5 5 10-11" stroke="#fffdf2" fill="none" stroke-width="3" stroke-linecap="round"/>' : star(0, 0, 10, "#fff8e0")}</g>`).join("")}${all(ids) ? Array.from({ length: 10 }, (_, i) => star(85 + ((i * 47) % 430), 85 + ((i * 51) % 185), 5 + (i % 3), "#fff6d6")).join("") : ""}`;
  }
  if (sceneId === 7) {
    scene = `${rainbow(["#dfb2be", "#e9d4a2", "#b9cda7", "#c1afd5"], 0.8)}${cloud(55, 135, 0.6)}${cloud(468, 139, 0.6)}<path d="M0 356q170-90 331-24t269 0v108H0" fill="#b8cba4"/><path d="M383 278v-79h75v79" fill="#d8bea0"/><path d="m370 205 49-42 53 42Z" fill="#caa6b2"/><rect x="409" y="240" width="20" height="38" rx="9" fill="#fff0c5"/>${flower(103, 336, "#f6e9b7")}${flower(507, 329, "#eac2cd")}<g class="${has("goodbye") ? "book-wiggle" : ""}">${friends(304)}</g>${star(185, 166, 9, "#e5cf94")}${star(411, 126, 8, "#c4afd1")}`;
  }
  const jar = (x: number, y: number, growing = false) =>
    `<g transform="translate(${x} ${y})"><path d="M-13-31h26v8q9 5 9 14v36q-22 10-44 0V-9q0-9 9-14Z" fill="#f7ffef55" stroke="#9db7b1" stroke-width="2"/><ellipse cy="22" rx="19" ry="5" fill="#c8b69a"/>${growing ? '<path d="M0 20V-6q-15-15-19-4Q-13 3 0-6q13-20 22-12Q17-3 0-6" fill="#acc895" stroke="#90ab7a" stroke-width="2"/>' : '<ellipse cy="18" rx="6" ry="4" fill="#b5a084"/>'}<path d="M-12-15v29" stroke="#fff9" stroke-width="4" stroke-linecap="round"/></g>`;
  const sign = `<g transform="translate(105 278) rotate(-8)"><path d="M0 0v77" stroke="#b49e7c" stroke-width="7"/><path d="M-43-31h80l18 20-18 20h-80Z" fill="#ead9b7"/><path d="M-27-17h48m-48 12h31" stroke="#bda985" stroke-width="3" stroke-linecap="round"/></g>`;
  const snail = `<g transform="translate(119 358)"><path d="M-35 16q30-13 66-1" fill="none" stroke="#bcb291" stroke-width="11" stroke-linecap="round"/><circle cy="-1" r="24" fill="#d5bbaf"/><path d="M11 7C-26 19-18-25 6-10q19 14-2 17" stroke="#b39791" stroke-width="3" fill="none"/><path d="m28 12 9-22m-1 22 16-15" stroke="#bcb291" stroke-width="4"/><circle cx="38" cy="-10" r="3" fill="#827468"/><circle cx="53" cy="-4" r="3" fill="#827468"/></g>`;
  const wateringCan = `<g transform="translate(452 362) rotate(-15)"><rect width="43" height="31" rx="9" fill="#d9b7bd"/><path d="m0 12-24-13-4 6 25 19" fill="#d9b7bd"/><path d="M42 5q27-6 20 14l-20 5" fill="none" stroke="#caa8b0" stroke-width="7"/></g>`;
  if (page === 1)
    scene = scene
      .replace('stroke="#dfb2b6"', 'stroke="#d4cbc0"')
      .replace('stroke="#bbcfaf"', 'stroke="#d4cbc0"');
  if ([2, 20, 21, 24, 29, 30].includes(page))
    scene += jar(
      page === 20 ? 115 : page === 24 ? 410 : 470,
      page === 20 ? 350 : 370,
      page >= 24,
    );
  if (page === 3 || page === 22) scene += sign;
  if (page === 4) scene += snail;
  if (page === 5)
    scene +=
      '<ellipse cx="178" cy="374" rx="72" ry="13" fill="#a7c7c688"/><path d="m130 375 17-3m28 6 24-4" stroke="#fff8" stroke-width="2"/><path d="m140 334 60-12 8 34-57 9Z" fill="#bba78d"/>';
  if (page === 7)
    scene +=
      '<path d="M177 331q-8-41 8-65" fill="none" stroke="#a1b487" stroke-width="4" stroke-dasharray="5 5"/>';
  if (page === 8) scene += wateringCan;
  if (page === 9)
    scene += flower(60, 343, "#fff5db") + flower(533, 332, "#f1c3ce");
  if (page === 10)
    scene +=
      '<ellipse cx="493" cy="375" rx="31" ry="11" fill="#fcf1df" stroke="#d9c9af"/>';
  if (page === 11)
    scene +=
      '<path d="m460 366 37 7-7 24-36-7Z" fill="#cab496"/><ellipse cx="430" cy="379" rx="25" ry="10" fill="#fcf4e4"/>';
  if (page === 12) scene += flower(92, 290, "#ecd5ad");
  if (page === 13)
    scene +=
      '<g fill="#bfaa8c"><ellipse cx="230" cy="337" rx="11" ry="7"/><ellipse cx="390" cy="366" rx="13" ry="8"/></g><path d="m280 344 19-5 20 11-19 4Z" fill="#a4bc94"/>';
  if (page === 14)
    scene += cloud(42, 400, 0.5) + cloud(91, 380, 0.5) + cloud(139, 360, 0.5);
  if (page === 15) scene += star(529, 98, 35, "#fff0b8");
  if (page === 16 || page === 23)
    scene +=
      '<path d="m162 136 138-44 150 62" fill="none" stroke="#e9dbb288" stroke-width="2" stroke-dasharray="5 9"/>';
  if (page === 17)
    scene += star(258, 297, 5, "#fff1b5") + star(393, 299, 5, "#fff1b5");
  if (page === 18)
    scene +=
      '<path d="m71 100-6 20m65 43-7 21m354 40-5 16m-33-139-7 19" stroke="#abc5c2" stroke-width="4" stroke-linecap="round"/>';
  if (page === 19)
    scene +=
      '<path d="m216 344 22 5m103 0 29-8" stroke="#d2b4bb" stroke-width="7" stroke-linecap="round"/>';
  if (page === 20)
    scene +=
      '<path d="M65 265q35-15 71-2m-65 17q53-21 83-6" fill="none" stroke="#eef3df" stroke-width="4"/>';
  if (page === 21)
    scene += '<ellipse cx="454" cy="405" rx="56" ry="8" fill="#9fbbba66"/>';
  if (page === 25) scene += flower(70, 336, "#fcf6e1");
  if (page === 26)
    scene +=
      '<path d="M273 310q30 14 59 0" stroke="#d4b5bc" stroke-width="6" stroke-linecap="round" fill="none"/>';
  if (page === 27) scene += star(298, 49, 13, "#eddb9c");
  if (page === 28)
    scene +=
      '<path d="M110 292a190 190 0 0 1 4-40" fill="none" stroke="#eee8d9" stroke-width="22"/>';
  if (page === 29)
    scene +=
      '<path d="m232 331 32 1m66 0 41-3" fill="none" stroke="#d6b5bc" stroke-width="8" stroke-linecap="round"/>';
  if (page === 30)
    scene += flower(46, 350, "#f2d3a8") + flower(549, 348, "#eed4dd");
  if (page === 31) scene += star(300, 67, 14, "#e5c8df") + cloud(210, 390, 0.5);
  return `<svg class="book-artwork" viewBox="0 0 600 440" role="img" aria-label="${["무지개 아래에서 첫 인사를 기다리는 말랑이 친구들", "구름 아래에서 무지개를 찾는 말랑이", "말랑이와 모모가 함께 기다리는 꽃밭", "베리와 친구들이 딸기를 나누는 숲속 소풍", "루루와 말랑이가 바라보는 작은 별자리", "커다란 잎사귀 아래 비를 피하는 친구들", "친구들의 마음으로 색을 되찾는 무지개", "무지개가 뜬 마을에 나란히 선 네 친구"][sceneId]}">${shared}${scene}<g opacity=".45">${Array.from({ length: 3 + (page % 5) }, (_, i) => star(45 + ((i * 113 + page * 23) % 510), 40 + ((i * 31 + page * 17) % 65), 2 + ((page + i) % 3), sceneId === 4 ? "#fff7de" : "#c3b398")).join("")}</g><rect class="book-paper-grain" width="600" height="440" filter="url(#book-grain)" fill="transparent" pointer-events="none"/></svg>`;
}
