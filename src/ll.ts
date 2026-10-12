import { KPattern, type KPatternData, type KPatternOrbitData } from "cubing/kpuzzle";
import { cube3x3x3 } from "cubing/puzzles";
import type { SetId } from "./types";

type Orbit = "CORNERS" | "EDGES" | "CENTERS";

const CORNER_COLS = [
  ["W", "R", "G"],
  ["W", "B", "R"],
  ["W", "O", "B"],
  ["W", "G", "O"],
  ["Y", "G", "R"],
  ["Y", "O", "G"],
  ["Y", "B", "O"],
  ["Y", "R", "B"],
] as const;

const EDGE_COLS = [
  ["W", "G"],
  ["W", "R"],
  ["W", "B"],
  ["W", "O"],
  ["Y", "G"],
  ["Y", "R"],
  ["Y", "B"],
  ["Y", "O"],
  ["G", "R"],
  ["G", "O"],
  ["B", "R"],
  ["B", "O"],
] as const;

/** Cubing 3x3 centers: U L F R B D */
const CENTER_COLS = ["W", "O", "G", "R", "B", "Y"] as const;

export type Hue = "Y" | "W" | "G" | "B" | "R" | "O";

const PAINT: Record<Hue, string> = {
  Y: "#F5D000",
  W: "#F3F3F3",
  G: "#009B4C",
  B: "#0055C4",
  R: "#D01C32",
  O: "#FF6A00",
};

const GRAY = "#C5C5C5";
const INK = "#1A1A1A";

type Pattern = Awaited<ReturnType<Awaited<ReturnType<typeof cube3x3x3.kpuzzle>>["defaultPattern"]>>;

let kpPromise: ReturnType<typeof cube3x3x3.kpuzzle> | null = null;

async function kpuzzle() {
  kpPromise ??= cube3x3x3.kpuzzle();
  return kpPromise;
}

function sticker(pattern: Pattern, orbit: Orbit, loc: number, slot: number): Hue {
  const data = pattern.patternData[orbit];
  const piece = data.pieces[loc];
  const ori = data.orientation[loc];
  const n = orbit === "CORNERS" ? 3 : orbit === "EDGES" ? 2 : 4;
  const src = (slot - ori + n * 4) % n;
  if (orbit === "CORNERS") return CORNER_COLS[piece][src];
  if (orbit === "EDGES") return EDGE_COLS[piece][src];
  return CENTER_COLS[piece];
}

export type LlStickers = {
  u: Hue[];
  f: Hue[];
  r: Hue[];
  b: Hue[];
  l: Hue[];
  edgePerm: number[];
  cornerPerm: number[];
};

const U_EDGES = [0, 1, 2, 3] as const;
const U_CORNERS = [0, 1, 2, 3] as const;

function readLl(pattern: Pattern, solved: Pattern): LlStickers {
  const u: Hue[] = [
    sticker(pattern, "CORNERS", 2, 0),
    sticker(pattern, "EDGES", 2, 0),
    sticker(pattern, "CORNERS", 1, 0),
    sticker(pattern, "EDGES", 3, 0),
    sticker(pattern, "CENTERS", 0, 0),
    sticker(pattern, "EDGES", 1, 0),
    sticker(pattern, "CORNERS", 3, 0),
    sticker(pattern, "EDGES", 0, 0),
    sticker(pattern, "CORNERS", 0, 0),
  ];
  const edgePerm = U_EDGES.map((loc) => {
    const piece = pattern.patternData.EDGES.pieces[loc];
    return U_EDGES.find((slot) => solved.patternData.EDGES.pieces[slot] === piece) ?? loc;
  });
  const cornerPerm = U_CORNERS.map((loc) => {
    const piece = pattern.patternData.CORNERS.pieces[loc];
    return U_CORNERS.find((slot) => solved.patternData.CORNERS.pieces[slot] === piece) ?? loc;
  });
  return {
    u,
    f: [
      sticker(pattern, "CORNERS", 3, 1),
      sticker(pattern, "EDGES", 0, 1),
      sticker(pattern, "CORNERS", 0, 2),
    ],
    r: [
      sticker(pattern, "CORNERS", 1, 2),
      sticker(pattern, "EDGES", 1, 1),
      sticker(pattern, "CORNERS", 0, 1),
    ],
    b: [
      sticker(pattern, "CORNERS", 2, 2),
      sticker(pattern, "EDGES", 2, 1),
      sticker(pattern, "CORNERS", 1, 1),
    ],
    l: [
      sticker(pattern, "CORNERS", 2, 1),
      sticker(pattern, "EDGES", 3, 1),
      sticker(pattern, "CORNERS", 3, 2),
    ],
    edgePerm,
    cornerPerm,
  };
}

const llCache = new Map<string, LlStickers>();
const arrangementCache = new Map<string, LlStickers[]>();
let svgSeq = 0;

/** Yellow positions on the top and the side ring. This is the case; the other colors can move. */
export function yellowMask(ll: LlStickers): string {
  const mark = (row: Hue[]) => row.map((hue) => (hue === "Y" ? "Y" : ".")).join("");
  return [ll.u, ll.f, ll.r, ll.b, ll.l].map(mark).join("/");
}

/** Side ring, the tiles that are not the top face. */
export function sideKey(ll: LlStickers): string {
  return [ll.f, ll.r, ll.b, ll.l].map((row) => row.join("")).join("/");
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items.slice()];
  const out: number[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = items.filter((_, index) => index !== i);
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

function groupsOf(orientation: ArrayLike<number>): number[][] {
  const groups = new Map<number, number[]>();
  for (let slot = 0; slot < 4; slot++) {
    const list = groups.get(orientation[slot]) ?? [];
    list.push(slot);
    groups.set(orientation[slot], list);
  }
  return [...groups.values()];
}

/** `from[dest]` is the slot whose piece moves into `dest`. Identity is included. */
function sources(groups: number[][]): number[][] {
  let acc: { slots: number[]; order: number[] }[][] = [[]];
  for (const slots of groups) {
    const next: { slots: number[]; order: number[] }[][] = [];
    for (const prefix of acc) {
      for (const order of permutations(slots)) next.push([...prefix, { slots, order }]);
    }
    acc = next;
  }
  return acc.map((picked) => {
    const from = [0, 1, 2, 3];
    for (const { slots, order } of picked) {
      for (let index = 0; index < slots.length; index++) from[slots[index]] = order[index];
    }
    return from;
  });
}

function parity(image: number[]): number {
  const seen = new Array<boolean>(image.length).fill(false);
  let odd = 0;
  for (let start = 0; start < image.length; start++) {
    if (seen[start]) continue;
    let length = 0;
    let cursor = start;
    while (!seen[cursor]) {
      seen[cursor] = true;
      cursor = image[cursor];
      length += 1;
    }
    if (length % 2 === 0) odd ^= 1;
  }
  return odd;
}

function movedParity(from: number[], orbit: number): number {
  const image = Array.from({ length: orbit }, (_, index) => index);
  for (let dest = 0; dest < from.length; dest++) image[from[dest]] = dest;
  return parity(image);
}

function copyData(pattern: Pattern): KPatternData {
  const data: KPatternData = {};
  for (const orbit of ["CORNERS", "EDGES", "CENTERS"] as const) {
    const source = pattern.patternData[orbit];
    const next: KPatternOrbitData = {
      pieces: Array.from(source.pieces),
      orientation: Array.from(source.orientation),
    };
    if (source.orientationMod) next.orientationMod = Array.from(source.orientationMod);
    data[orbit] = next;
  }
  return data;
}

function place(pieces: ArrayLike<number>, from: number[]): number[] {
  const next = Array.from(pieces);
  for (let dest = 0; dest < from.length; dest++) next[dest] = pieces[from[dest]];
  return next;
}

/**
 * Side-colorings of one OLL. Pieces swap only inside a shared orientation,
 * so the yellow pattern stays and the algorithm still orients the layer.
 * PLL is not rearranged: its side colors are the case.
 */
export async function caseArrangements(setup: string, solve: string): Promise<LlStickers[]> {
  const key = `${setup.replace(/\s+/g, " ").trim()}|${solve.replace(/\s+/g, " ").trim()}`;
  const hit = arrangementCache.get(key);
  if (hit) return hit;
  const kp = await kpuzzle();
  const solved = kp.defaultPattern().applyAlg("z2");
  const base = kp.defaultPattern().applyAlg(setup ? `z2 ${setup}` : "z2");
  const mask = yellowMask(readLl(base, solved));
  const edgeFrom = sources(groupsOf(base.patternData.EDGES.orientation));
  const cornerFrom = sources(groupsOf(base.patternData.CORNERS.orientation));
  const seen = new Set<string>();
  const out: LlStickers[] = [];
  for (const edges of edgeFrom) {
    for (const corners of cornerFrom) {
      if (movedParity(edges, 12) !== movedParity(corners, 8)) continue;
      const data = copyData(base);
      data.EDGES.pieces = place(base.patternData.EDGES.pieces, edges);
      data.CORNERS.pieces = place(base.patternData.CORNERS.pieces, corners);
      const placed = new KPattern(base.kpuzzle, data);
      const picture = readLl(placed, solved);
      if (yellowMask(picture) !== mask) throw new Error("arrangement moved a yellow sticker");
      const oriented = placed.applyAlg(solve);
      const after = readLl(oriented, solved);
      if (after.u.some((hue) => hue !== "Y")) throw new Error("arrangement is not oriented by the algorithm");
      const centers = oriented.patternData.CENTERS;
      const home = solved.patternData.CENTERS;
      for (let index = 0; index < centers.pieces.length; index++) {
        if (centers.pieces[index] !== home.pieces[index] || centers.orientation[index] !== home.orientation[index]) {
          throw new Error("arrangement does not leave the centers in place");
        }
      }
      const sides = sideKey(picture);
      if (seen.has(sides)) continue;
      seen.add(sides);
      out.push(picture);
    }
  }
  if (!out.length) throw new Error("case has no drawable arrangement");
  arrangementCache.set(key, out);
  return out;
}

export async function lastLayer(moves: string): Promise<LlStickers> {
  const key = moves.replace(/\s+/g, " ").trim();
  const hit = llCache.get(key);
  if (hit) return hit;
  const kp = await kpuzzle();
  const solved = kp.defaultPattern().applyAlg("z2");
  const pattern = kp.defaultPattern().applyAlg(key ? `z2 ${key}` : "z2");
  const ll = readLl(pattern, solved);
  llCache.set(key, ll);
  return ll;
}

function fill(hue: Hue, set: SetId): string {
  if (set === "oll") return hue === "Y" ? PAINT.Y : GRAY;
  return PAINT[hue];
}

function cycles(perm: number[]): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let i = 0; i < perm.length; i++) {
    if (seen.has(i) || perm[i] === i) continue;
    const cycle: number[] = [];
    let cur = i;
    while (!seen.has(cur)) {
      seen.add(cur);
      cycle.push(cur);
      cur = perm[cur];
    }
    if (cycle.length > 1) out.push(cycle);
  }
  return out;
}

type Pt = { x: number; y: number };

function arrowPath(from: Pt, to: Pt, bend: number): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export function llSvg(ll: LlStickers, set: SetId, mini = false, markerId = "ah"): string {
  const cell = 18;
  const gap = 1.1;
  const face = 22;
  const bar = mini ? 5.2 : 6.4;
  const inset = 1.6;
  const lift = 1.8;
  const stroke = mini ? 0.9 : 1.15;

  const x0 = (c: number) => face + c * (cell + gap);
  const y0 = (r: number) => face + r * (cell + gap);
  const cx = (c: number) => x0(c) + cell / 2;
  const cy = (r: number) => y0(r) + cell / 2;

  const tiles: string[] = [];
  for (let i = 0; i < 9; i++) {
    const c = i % 3;
    const r = Math.floor(i / 3);
    tiles.push(
      `<rect x="${x0(c)}" y="${y0(r)}" width="${cell}" height="${cell}" fill="${fill(ll.u[i], set)}" stroke="${INK}" stroke-width="${stroke}"/>`,
    );
  }

  const bars: string[] = [];
  for (let i = 0; i < 3; i++) {
    bars.push(
      `<rect x="${x0(i) + inset}" y="${y0(2) + cell + lift}" width="${cell - inset * 2}" height="${bar}" fill="${fill(ll.f[i], set)}" stroke="${INK}" stroke-width="${stroke}"/>`,
    );
    bars.push(
      `<rect x="${x0(2) + cell + lift}" y="${y0(i) + inset}" width="${bar}" height="${cell - inset * 2}" fill="${fill(ll.r[i], set)}" stroke="${INK}" stroke-width="${stroke}"/>`,
    );
    bars.push(
      `<rect x="${x0(i) + inset}" y="${face - lift - bar}" width="${cell - inset * 2}" height="${bar}" fill="${fill(ll.b[i], set)}" stroke="${INK}" stroke-width="${stroke}"/>`,
    );
    bars.push(
      `<rect x="${face - lift - bar}" y="${y0(i) + inset}" width="${bar}" height="${cell - inset * 2}" fill="${fill(ll.l[i], set)}" stroke="${INK}" stroke-width="${stroke}"/>`,
    );
  }

  let arrows = "";
  if (set === "pll") {
    const edgePt: Pt[] = [
      { x: cx(1), y: cy(2) },
      { x: cx(2), y: cy(1) },
      { x: cx(1), y: cy(0) },
      { x: cx(0), y: cy(1) },
    ];
    const cornerPt: Pt[] = [
      { x: cx(2), y: cy(2) },
      { x: cx(2), y: cy(0) },
      { x: cx(0), y: cy(0) },
      { x: cx(0), y: cy(2) },
    ];
    const sw = mini ? 1.4 : 2.05;
    const parts: string[] = [];
    const draw = (pts: Pt[], perm: number[]) => {
      for (const cycle of cycles(perm)) {
        const bend = cycle.length === 2 ? 0 : 7;
        for (let i = 0; i < cycle.length; i++) {
          const a = pts[cycle[i]];
          const b = pts[cycle[(i + 1) % cycle.length]];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const pull = cycle.length === 2 ? 5.5 : 4.2;
          const from = { x: a.x + (dx / len) * pull, y: a.y + (dy / len) * pull };
          const to = { x: b.x - (dx / len) * pull, y: b.y - (dy / len) * pull };
          parts.push(
            `<path d="${arrowPath(from, to, bend)}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" marker-end="url(#${markerId})"/>`,
          );
        }
      }
    };
    draw(edgePt, ll.edgePerm);
    draw(cornerPt, ll.cornerPerm);
    arrows = `
      <defs>
        <marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="${INK}"/>
        </marker>
      </defs>
      ${parts.join("")}
    `;
  }

  return `<svg class="ll-svg" viewBox="0 0 100 100" aria-hidden="true">${tiles.join("")}${bars.join("")}${arrows}</svg>`;
}

export function tabIconSvg(ll: LlStickers, set: SetId): string {
  const cell = 10;
  const gap = 0.5;
  const origin = 0.5;
  const paint: Record<Hue, string> = {
    Y: "#ffd21a",
    W: "#F7F7F4",
    G: "#22C55E",
    B: "#3B82F6",
    R: "#EF4444",
    O: "#FF7A18",
  };
  const plastic = "#e6e8ee";
  const tone = (hue: Hue) => (set === "oll" ? (hue === "Y" ? paint.Y : plastic) : paint[hue]);
  const x0 = (c: number) => origin + c * (cell + gap);
  const y0 = (r: number) => origin + r * (cell + gap);
  const tiles: string[] = [];
  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    tiles.push(
      `<rect x="${x0(col).toFixed(1)}" y="${y0(row).toFixed(1)}" width="${cell}" height="${cell}" rx="1" fill="${tone(ll.u[i])}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d8dbe3"/>${tiles.join("")}</svg>`;
}

export async function llMarkup(setupAlg: string, set: SetId, mini = false): Promise<string> {
  return llSvg(await lastLayer(setupAlg), set, mini, `ah-${++svgSeq}`);
}
