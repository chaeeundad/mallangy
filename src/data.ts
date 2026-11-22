export const COLORS = [
  "#ff8caf",
  "#ffb8c6",
  "#ff907c",
  "#ffb969",
  "#ffdc72",
  "#ffebaa",
  "#b4d779",
  "#86d6b4",
  "#6bc7c8",
  "#8ccced",
  "#8d9deb",
  "#b69ae9",
  "#d1b5ef",
  "#eb9bcc",
  "#b38b7b",
  "#fff0cf",
];
export const SHAPES = [
  "동글이",
  "복숭아",
  "별이",
  "고양이",
  "토끼",
  "곰돌이",
  "개구리",
  "오리",
  "딸기",
  "푸딩",
];
export type Hero = {
  name: string;
  colorIndex: number;
  baseColorIndex: number;
  faceIndex: number;
  shapeIndex: number;
  slangi: boolean;
  slangiSound: string;
  stickers: { emoji: string; x: number; y: number; z: number }[];
  paint: { x: number; y: number; z: number; color: string }[];
  crunch: { x: number; y: number; z: number; kind: string; hue: number }[];
};
export const DEFAULT_HERO: Hero = {
  name: "복숭이",
  colorIndex: 1,
  baseColorIndex: 1,
  faceIndex: 0,
  shapeIndex: 0,
  slangi: false,
  slangiSound: "putty",
  stickers: [],
  paint: [],
  crunch: [],
};
export const WORLDS = [
  {
    id: 0,
    name: "햇살 초원",
    subtitle: "처음 만나는 설렘",
    color: "#e7edbe",
    ink: "#667b47",
    sky: ["#dcefe8", "#f7f4d9"],
    ground: "#adce8e",
    soil: "#e8d2aa",
    accent: "#edbd6b",
    friend: "씨앗 요정 모모",
    emoji: "🌱",
  },
  {
    id: 1,
    name: "딸기빛 숲",
    subtitle: "함께라서 더 달콤해",
    color: "#f3d9df",
    ink: "#a76579",
    sky: ["#eadfed", "#fff0e8"],
    ground: "#a4cbb0",
    soil: "#d8b9af",
    accent: "#e9a0b6",
    friend: "딸기 토끼 베리",
    emoji: "🍓",
  },
  {
    id: 2,
    name: "별빛 구름섬",
    subtitle: "우리만의 무지개",
    color: "#e4e0f3",
    ink: "#8273ac",
    sky: ["#d4d9ed", "#f1e8f7"],
    ground: "#c1b4df",
    soil: "#ded5ec",
    accent: "#bdace2",
    friend: "별지기 루루",
    emoji: "🌙",
  },
];
export const STAGE_NAMES = [
  "작은 발걸음",
  "바람의 징검다리",
  "모모의 작은 정원",
  "분홍빛 오솔길",
  "딸기잼 시냇물",
  "베리의 소풍",
  "구름 위 산책",
  "반짝이는 약속",
  "무지개의 집",
];
export type Level = {
  id: number;
  world: number;
  name: string;
  width: number;
  grounds: [number, number][];
  platforms: [number, number, number][];
  stars: [number, number][];
  berries: [number, number][];
  checkpoints: number[];
  goal: number;
  intro: string[];
  outro: string[];
};
export function makeLevel(id: number): Level {
  const world = Math.floor(id / 3),
    step = id % 3;
  const width = 2500 + step * 420,
    gap = world === 0 ? 78 : world === 1 ? 100 : 115;
  const grounds: [number, number][] = [
    [0, 610],
    [610 + gap, 615],
    [1225 + gap * 2, 640],
    [1865 + gap * 3, width - (1865 + gap * 3)],
  ];
  const platforms: [number, number, number][] = [
    [260, 140, 90],
    [470, 115, 155],
    [750, 130, 100],
    [1010, 150, 155],
    [1320, 130, 100],
    [1550, 150, 165],
    [1830, 130, 115],
    [2130, 155, 150],
  ];
  if (step > 0) platforms.push([2450, 140, 100]);
  if (step > 1) platforms.push([2700, 145, 155]);
  const stars: [number, number][] = [
    [145, 43],
    [310, 125],
    [520, 190],
    [820, 135],
    [1060, 190],
    [1390, 135],
    [1620, 200],
    [1890, 150],
    [2190, 185],
    [width - 170, 43],
  ];
  const intro = [
    [
      "안녕, 나는 모모야! 어젯밤 바람에 무지개가 흩어졌어.",
      "반짝별을 모으면 무지개 조각이 다시 깨어난대. 함께 찾아줄래?",
    ],
    [
      "작은 틈도 폴짝 넘을 수 있어! 점프 버튼을 오래 누르면 조금 더 높이 올라가.",
      "놓친 별은 언제든 다시 와서 찾을 수 있어. 천천히 가도 괜찮아.",
    ],
    ["여기가 내 정원이야. 초록 무지개 조각이 꽃들 사이에 숨어 있어!"],
    [
      "나는 베리야. 숲의 색이 조금씩 사라지고 있어.",
      "너의 반짝별로 숲에 다시 따뜻한 빛을 돌려줄래?",
    ],
    [
      "딸기잼 시냇물은 미끄러워 보여도 괜찮아. 안전한 곳에서 다시 시작할 수 있거든!",
    ],
    ["소풍에 와줘서 고마워. 분홍빛 조각을 찾으면 별빛 구름섬으로 가 보자!"],
    [
      "어서 와, 나는 루루야. 무지개의 마지막 빛을 지키고 있어.",
      "구름 발판은 위로 폴짝 올라가서 밟아봐. 아래에서는 통과할 수 있어.",
    ],
    ["거의 다 왔어. 너와 함께 걸어온 길이 벌써 반짝이고 있어!"],
    ["마지막 조각은 저 집에 있어. 네가 만든 친구와 끝까지 함께 가 보자!"],
  ][id];
  const outro =
    id === 8
      ? [
          "우리가 해냈어! 세상에 무지개가 돌아왔어.",
          "빠르지 않아도, 완벽하지 않아도 괜찮아. 함께한 여행이 가장 반짝이는 선물이야.",
          "이제 언제든 친구들을 만나러 와. 새로운 말랑이와 다른 여행을 만들어도 좋아!",
        ]
      : step === 2
        ? [
            `${WORLDS[world].friend}의 무지개 조각을 찾았어!`,
            world === 0
              ? "이제 딸기빛 숲으로 가 보자. 새로운 친구가 기다리고 있어."
              : "다음 여행지는 별빛 구름섬이야. 마지막 빛을 만나러 가자!",
          ]
        : [
            "별빛을 모아줘서 고마워! 길에 다시 색이 돌아오고 있어.",
            "다음 길에서도 네가 만든 친구와 함께 걸어보자.",
          ];
  return {
    id,
    world,
    name: STAGE_NAMES[id],
    width,
    grounds,
    platforms,
    stars,
    berries: [
      [405, 45],
      [1160, 45],
      [1730, 44],
    ],
    checkpoints: [610 + gap, 1225 + gap * 2, 1865 + gap * 3],
    goal: width - 90,
    intro,
    outro,
  };
}
