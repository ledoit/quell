import { cube3x3x3 } from "cubing/puzzles";
import { caseSetup } from "./alg";
import type { Hue, Scheme } from "./ll";
import type { SlotId } from "./slot";

type Orbit = "CORNERS" | "EDGES" | "CENTERS";
type Face = "U" | "D" | "F" | "B" | "R" | "L";
type Pattern = Awaited<ReturnType<Awaited<ReturnType<typeof cube3x3x3.kpuzzle>>["defaultPattern"]>>;

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
const CENTER_COLS = ["W", "O", "G", "R", "B", "Y"] as const;
const PAINT: Record<Hue, string> = {
  Y: "#f5c518",
  W: "#f4f4f1",
  G: "#009b48",
  B: "#0051ba",
  R: "#b71234",
  O: "#ff5800",
};
const GRAY = "#e3e1d9";
const SHADE: Record<Face, number> = { U: 1.06, D: 0.72, F: 0.94, B: 0.7, R: 0.84, L: 0.8 };

const CORNER_POS: Record<number, [number, number, number]> = {
  0: [1, 1, 1],
  1: [1, 1, -1],
  2: [-1, 1, -1],
  3: [-1, 1, 1],
  4: [1, -1, 1],
  5: [-1, -1, 1],
  6: [-1, -1, -1],
  7: [1, -1, -1],
};
const EDGE_POS: Record<number, [number, number, number]> = {
  0: [0, 1, 1],
  1: [1, 1, 0],
  2: [0, 1, -1],
  3: [-1, 1, 0],
  4: [0, -1, 1],
  5: [1, -1, 0],
  6: [0, -1, -1],
  7: [-1, -1, 0],
  8: [1, 0, 1],
  9: [-1, 0, 1],
  10: [1, 0, -1],
  11: [-1, 0, -1],
};
const SLOT_PIECE = {
  FR: { corner: 4, edge: 8 },
  FL: { corner: 5, edge: 9 },
  BR: { corner: 7, edge: 10 },
  BL: { corner: 6, edge: 11 },
} as const;

const FACE_LOC: Record<Face, number> = { U: 0, L: 1, F: 2, R: 3, B: 4, D: 5 };
const NORMAL: Record<Face, [number, number, number]> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

type Vec = [number, number, number];
type Sticker = { at: Vec; face: Face; hue: Hue; pair: boolean; cross: boolean };


let ready: Promise<{ solved: Pattern; cornerFace: Face[][]; edgeFace: Face[][] }> | null = null;

function hueAt(pattern: Pattern, orbit: Orbit, loc: number, slot: number): Hue {
  const data = pattern.patternData[orbit];
  const piece = data.pieces[loc];
  const ori = data.orientation[loc];
  const n = orbit === "CORNERS" ? 3 : orbit === "EDGES" ? 2 : 1;
  const src = (slot - ori + n * 8) % n;
  if (orbit === "CORNERS") return CORNER_COLS[piece][src];
  if (orbit === "EDGES") return EDGE_COLS[piece][src];
  return CENTER_COLS[piece];
}

function boot() {
  ready ??= (async () => {
    const kp = await cube3x3x3.kpuzzle();
    const solved = kp.defaultPattern().applyAlg("z2");
    const centerFace: Record<string, Face> = {};
    (Object.keys(FACE_LOC) as Face[]).forEach((face) => {
      centerFace[hueAt(solved, "CENTERS", FACE_LOC[face], 0)] = face;
    });
    const cornerFace = Array.from({ length: 8 }, (_, loc) =>
      [0, 1, 2].map((slot) => centerFace[hueAt(solved, "CORNERS", loc, slot)]),
    );
    const edgeFace = Array.from({ length: 12 }, (_, loc) =>
      [0, 1].map((slot) => centerFace[hueAt(solved, "EDGES", loc, slot)]),
    );
    return { solved, cornerFace, edgeFace };
  })();
  return ready;
}

export async function stillStickers(moves: string, slot: SlotId): Promise<Sticker[]> {
  const { solved, cornerFace, edgeFace } = await boot();
  const kp = await cube3x3x3.kpuzzle();
  const pattern = kp.defaultPattern().applyAlg(moves ? `z2 ${caseSetup(moves)}` : "z2");
  const spec = SLOT_PIECE[slot];
  const cornerPiece = solved.patternData.CORNERS.pieces[spec.corner];
  const edgePiece = solved.patternData.EDGES.pieces[spec.edge];
  const crossPieces = new Set([4, 5, 6, 7].map((loc) => solved.patternData.EDGES.pieces[loc]));
  const out: Sticker[] = [];
  const push = (orbit: Orbit, loc: number, at: Vec, faces: Face[], piece: number) => {
    const pair = orbit === "CORNERS" ? piece === cornerPiece : orbit === "EDGES" ? piece === edgePiece : false;
    const cross = orbit === "EDGES" && crossPieces.has(piece);
    faces.forEach((face, index) => {
      const hue = hueAt(pattern, orbit, loc, index);
      out.push({ at, face, hue, pair, cross });
    });
  };
  for (let loc = 0; loc < 8; loc++) push("CORNERS", loc, CORNER_POS[loc], cornerFace[loc], pattern.patternData.CORNERS.pieces[loc]);
  for (let loc = 0; loc < 12; loc++) push("EDGES", loc, EDGE_POS[loc], edgeFace[loc], pattern.patternData.EDGES.pieces[loc]);
  (Object.keys(NORMAL) as Face[]).forEach((face) => {
    const [x, y, z] = NORMAL[face];
    out.push({ at: [x, y, z], face, hue: hueAt(pattern, "CENTERS", FACE_LOC[face], 0), pair: false, cross: face === "D" });
  });
  return out;
}

/** ~32° of yaw so the side face is a readable grid. Top is still the large face. */
function yawFor(slot: SlotId): number {
  return slot === "FL" || slot === "BL" ? -0.56 : 0.56;
}

function shade(hex: string, face: Face): string {
  const n = SHADE[face];
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * n));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * n));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * n));
  return `rgb(${r} ${g} ${b})`;
}

function mapHue(hue: Hue, scheme?: Scheme): Hue {
  return scheme ? scheme[hue] : hue;
}

/** Recognition colors the pair, the cross, and the centers. Faces colors every sticker. */
function inked(sticker: Sticker, full: boolean): boolean {
  if (full || sticker.pair || sticker.cross) return true;
  return sticker.at.filter((n) => n === 0).length >= 2;
}

type Cam = { pos: Vec; right: Vec; up: Vec; forward: Vec };

function camera(yaw: number): Cam {
  const dist = 8.6;
  const elev = 0.5;
  const pos: Vec = [
    Math.sin(yaw) * Math.cos(elev) * dist,
    Math.sin(elev) * dist,
    Math.cos(yaw) * Math.cos(elev) * dist,
  ];
  const forward = norm(mul(pos, -1));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { pos, right, up, forward };
}

function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function mul(a: Vec, s: number): Vec {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a: Vec): Vec {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}

function project(p: Vec, cam: Cam, size: number): [number, number] {
  const rel = add(p, mul(cam.pos, -1));
  const z = dot(rel, cam.forward);
  const x = dot(rel, cam.right);
  const y = dot(rel, cam.up);
  const s = (size * 1.55) / Math.max(0.2, z);
  return [size / 2 + x * s, size / 2 - y * s];
}

function facelet(at: Vec, face: Face, lift = 0): Vec[] {
  const n = NORMAL[face];
  const center = add(at, mul(n, 0.5 + lift));
  const u: Vec = n[1] === 0 ? [0, 1, 0] : [0, 0, 1];
  const r = norm(cross(u, n));
  const v = cross(n, r);
  const h = 0.42;
  return [
    add(center, add(mul(r, -h), mul(v, -h))),
    add(center, add(mul(r, h), mul(v, -h))),
    add(center, add(mul(r, h), mul(v, h))),
    add(center, add(mul(r, -h), mul(v, h))),
  ];
}

/** Screen outline of the plastic cube. Hidden stickers are drawn only outside it. */
function silhouette(cam: Cam, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (const x of [-1.5, 1.5]) {
    for (const y of [-1.5, 1.5]) {
      for (const z of [-1.5, 1.5]) pts.push(project([x, y, z], cam, size));
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const pt of pts) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const pt = pts[i];
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function tiltedAxis(slot: SlotId): number {
  return slot === "FL" || slot === "BL" ? -1 : 1;
}

/** Bottom corner on the side the camera is not showing. Its stickers never clear the silhouette. */
function buried(at: Vec, slot: SlotId): boolean {
  return at[1] === -1 && at[0] === -tiltedAxis(slot) && at[2] === -1;
}

function levitates(sticker: Sticker, slot: SlotId): boolean {
  if (!sticker.pair || buried(sticker.at, slot)) return false;
  const side = tiltedAxis(slot);
  const hiddenSide: Face = side === 1 ? "L" : "R";
  if (sticker.face === "B") return sticker.at[1] === 1 || sticker.at[0] === side;
  if (sticker.face === "D") return sticker.at[0] === side || sticker.at[2] === 1;
  return sticker.face === hiddenSide && sticker.at[1] === 1;
}

type Quad = { pts: Vec[]; color: string; depth: number };

function paint(ctx: CanvasRenderingContext2D, quads: Quad[], cam: Cam, size: number) {
  quads.sort((a, b) => b.depth - a.depth);
  for (const quad of quads) {
    ctx.beginPath();
    quad.pts.forEach((p, i) => {
      const [x, y] = project(p, cam, size);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = quad.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(26,26,26,0.18)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }
}

/** Locked still. Top and front are about equal, front a little larger. Yaw opens one side. */
export function stillUrl(stickers: Sticker[], slot: SlotId, scheme?: Scheme, full = false): string {
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const cam = camera(yawFor(slot));
  const body: Quad[] = [];
  for (const sticker of stickers) {
    const n = NORMAL[sticker.face];
    const center = add(sticker.at, mul(n, 0.5));
    const toward = add(cam.pos, mul(center, -1));
    if (sticker.face === "D" || dot(n, toward) <= 0.05) continue;
    const hue = inked(sticker, full) ? mapHue(sticker.hue, scheme) : null;
    body.push({
      pts: facelet(sticker.at, sticker.face),
      color: hue ? shade(PAINT[hue], sticker.face) : shade(GRAY, sticker.face),
      depth: dot(center, cam.forward),
    });
  }
  const behind: Quad[] = [];
  const lift = 0.55;
  for (const sticker of stickers) {
    if (!levitates(sticker, slot)) continue;
    const hue = mapHue(sticker.hue, scheme);
    const n = NORMAL[sticker.face];
    const center = add(sticker.at, mul(n, 0.5 + lift));
    behind.push({
      pts: facelet(sticker.at, sticker.face, lift),
      color: PAINT[hue],
      depth: dot(center, cam.forward),
    });
  }
  const outline = silhouette(cam, size);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip("evenodd");
  paint(ctx, behind, cam, size);
  ctx.restore();
  paint(ctx, body, cam, size);
  const quads: Quad[] = [];
  let buriedIndex = 0;
  for (const sticker of stickers) {
    if (!sticker.pair || !buried(sticker.at, slot)) continue;
    const hue = mapHue(sticker.hue, scheme);
    const toward = norm(add(cam.pos, mul(sticker.at, -1)));
    const anchor = add(add(sticker.at, mul(toward, 1.45)), mul(cam.up, buriedIndex * 0.42));
    buriedIndex += 1;
    const dir = mul(toward, -1);
    const side = norm(cross(toward, cam.up));
    const start = add(anchor, mul(dir, -0.16));
    const neck = add(anchor, mul(dir, 0.08));
    const tip = add(anchor, mul(dir, 0.32));
    const depth = dot(tip, cam.forward) + 4;
    quads.push({
      pts: [
        add(start, mul(side, 0.07)),
        add(neck, mul(side, 0.07)),
        add(neck, mul(side, -0.07)),
        add(start, mul(side, -0.07)),
      ],
      color: PAINT[hue],
      depth,
    });
    quads.push({
      pts: [add(neck, mul(side, 0.16)), tip, add(neck, mul(side, -0.16))],
      color: PAINT[hue],
      depth,
    });
  }
  paint(ctx, quads, cam, size);
  return canvas.toDataURL("image/png");
}

export function stillHtml(url: string): string {
  return url ? `<img class="still" alt="" draggable="false" src="${url}" />` : `<div class="still"></div>`;
}
