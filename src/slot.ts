import { cube3x3x3 } from "cubing/puzzles";
import { caseSetup } from "./alg";
import type { Hue, Scheme } from "./ll";

export type SlotId = "FR" | "FL" | "BR" | "BL";

type Orbit = "CORNERS" | "EDGES" | "CENTERS";
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

/** Cubing centers after the same z2 home as the last layer: U L F R B D. */
const CENTER_COLS = ["W", "O", "G", "R", "B", "Y"] as const;

const SLOTS: SlotId[] = ["FR", "FL", "BR", "BL"];

const SLOT = {
  FR: { faces: ["F", "R"] as const, corner: 4, edge: 8 },
  FL: { faces: ["F", "L"] as const, corner: 5, edge: 9 },
  BR: { faces: ["B", "R"] as const, corner: 7, edge: 10 },
  BL: { faces: ["B", "L"] as const, corner: 6, edge: 11 },
};

const FACE_LOC: Record<string, number> = { U: 0, L: 1, F: 2, R: 3, B: 4, D: 5 };

/** U face, reading order. Corner or edge location, and which way is up. */
const U_FACE: { orbit: Orbit; loc: number }[] = [
  { orbit: "CORNERS", loc: 2 },
  { orbit: "EDGES", loc: 2 },
  { orbit: "CORNERS", loc: 1 },
  { orbit: "EDGES", loc: 3 },
  { orbit: "CENTERS", loc: 0 },
  { orbit: "EDGES", loc: 1 },
  { orbit: "CORNERS", loc: 3 },
  { orbit: "EDGES", loc: 0 },
  { orbit: "CORNERS", loc: 0 },
];

const SIDE_FACE: Record<"n" | "e" | "s" | "w", { face: string; cells: { orbit: Orbit; loc: number }[] }> = {
  n: {
    face: "B",
    cells: [
      { orbit: "CORNERS", loc: 2 },
      { orbit: "EDGES", loc: 2 },
      { orbit: "CORNERS", loc: 1 },
    ],
  },
  e: {
    face: "R",
    cells: [
      { orbit: "CORNERS", loc: 1 },
      { orbit: "EDGES", loc: 1 },
      { orbit: "CORNERS", loc: 0 },
    ],
  },
  s: {
    face: "F",
    cells: [
      { orbit: "CORNERS", loc: 3 },
      { orbit: "EDGES", loc: 0 },
      { orbit: "CORNERS", loc: 0 },
    ],
  },
  w: {
    face: "L",
    cells: [
      { orbit: "CORNERS", loc: 2 },
      { orbit: "EDGES", loc: 3 },
      { orbit: "CORNERS", loc: 3 },
    ],
  },
};

export type SlotFace = {
  slot: SlotId;
  u: (Hue | null)[];
  n: (Hue | null)[];
  e: (Hue | null)[];
  s: (Hue | null)[];
  w: (Hue | null)[];
  /** Center, slot edge, slot corner. Center is always the side color. */
  pocketA: (Hue | null)[];
  pocketB: (Hue | null)[];
};

let kpPromise: ReturnType<typeof cube3x3x3.kpuzzle> | null = null;
let homePromise: Promise<Pattern> | null = null;
let faceOfPromise: Promise<{ corner: string[][]; edge: string[][] }> | null = null;

async function kpuzzle() {
  kpPromise ??= cube3x3x3.kpuzzle();
  return kpPromise;
}

async function home() {
  homePromise ??= kpuzzle().then((kp) => kp.defaultPattern().applyAlg("z2"));
  return homePromise;
}

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

async function faceOf() {
  faceOfPromise ??= home().then((solved) => {
    const centerFace: Record<string, string> = {};
    for (const [loc, face] of [[0, "U"], [1, "L"], [2, "F"], [3, "R"], [4, "B"], [5, "D"]] as const) {
      centerFace[hueAt(solved, "CENTERS", loc, 0)] = face;
    }
    return {
      corner: Array.from({ length: 8 }, (_, loc) => [0, 1, 2].map((slot) => centerFace[hueAt(solved, "CORNERS", loc, slot)])),
      edge: Array.from({ length: 12 }, (_, loc) => [0, 1].map((slot) => centerFace[hueAt(solved, "EDGES", loc, slot)])),
    };
  });
  return faceOfPromise;
}

function facing(faces: string[], face: string): number {
  const index = faces.indexOf(face);
  if (index < 0) throw new Error(`no ${face} on ${faces.join("")}`);
  return index;
}

function isPair(pattern: Pattern, solved: Pattern, slot: SlotId, orbit: Orbit, loc: number): boolean {
  const spec = SLOT[slot];
  const piece = pattern.patternData[orbit].pieces[loc];
  if (orbit === "CORNERS") return piece === solved.patternData.CORNERS.pieces[spec.corner];
  if (orbit === "EDGES") return piece === solved.patternData.EDGES.pieces[spec.edge];
  return false;
}

export async function slotFace(moves: string, slot: SlotId): Promise<SlotFace> {
  const kp = await kpuzzle();
  const solved = await home();
  const faces = await faceOf();
  const pattern = kp.defaultPattern().applyAlg(moves ? `z2 ${caseSetup(moves)}` : "z2");
  const spec = SLOT[slot];
  const paint = (orbit: Orbit, loc: number, face: string): Hue | null => {
    if (orbit === "CENTERS") return hueAt(pattern, "CENTERS", loc, 0);
    if (!isPair(pattern, solved, slot, orbit, loc)) return null;
    const table = orbit === "CORNERS" ? faces.corner[loc] : faces.edge[loc];
    return hueAt(pattern, orbit, loc, facing(table, face));
  };
  const side = (key: "n" | "e" | "s" | "w") => {
    const row = SIDE_FACE[key];
    return row.cells.map((cell) => paint(cell.orbit, cell.loc, row.face));
  };
  const pocket = (face: string) => {
    const center = hueAt(pattern, "CENTERS", FACE_LOC[face], 0);
    const edge = paint("EDGES", spec.edge, face);
    const corner = paint("CORNERS", spec.corner, face);
    return [center, edge, corner];
  };
  return {
    slot,
    u: U_FACE.map((cell) => paint(cell.orbit, cell.loc, "U")),
    n: side("n"),
    e: side("e"),
    s: side("s"),
    w: side("w"),
    pocketA: pocket(spec.faces[0]),
    pocketB: pocket(spec.faces[1]),
  };
}

export function recolorSlot(face: SlotFace, scheme: Scheme): SlotFace {
  const map = (hue: Hue | null) => (hue ? scheme[hue] : null);
  const row = (hues: (Hue | null)[]) => hues.map(map);
  return {
    slot: face.slot,
    u: row(face.u),
    n: row(face.n),
    e: row(face.e),
    s: row(face.s),
    w: row(face.w),
    pocketA: row(face.pocketA),
    pocketB: row(face.pocketB),
  };
}

export function slotKey(face: SlotFace): string {
  const cell = (hue: Hue | null) => hue ?? ".";
  return [face.u, face.n, face.e, face.s, face.w, face.pocketA, face.pocketB].map((row) => row.map(cell).join("")).join("/");
}

/** Pair picture of one slot, colors written as the slot's own front, right, and down. */
export async function pairSig(moves: string): Promise<string> {
  const kp = await kpuzzle();
  const solved = await home();
  const faces = await faceOf();
  const pattern = kp.defaultPattern().applyAlg(moves ? `z2 ${caseSetup(moves)}` : "z2");
  const slots = affected(pattern, solved);
  if (slots.length !== 1) return "";
  const slot = slots[0];
  const spec = SLOT[slot];
  const role: Record<string, string> = { [hueAt(solved, "CENTERS", 5, 0)]: "D" };
  role[hueAt(solved, "CENTERS", FACE_LOC[spec.faces[0]], 0)] = "A";
  role[hueAt(solved, "CENTERS", FACE_LOC[spec.faces[1]], 0)] = "B";
  const cornerPiece = solved.patternData.CORNERS.pieces[spec.corner];
  const edgePiece = solved.patternData.EDGES.pieces[spec.edge];
  const cLoc = locate(pattern, "CORNERS", cornerPiece);
  const eLoc = locate(pattern, "EDGES", edgePiece);
  const local = (face: string) => {
    const opp: Record<string, string> = { F: "B", B: "F", R: "L", L: "R" };
    if (face === "U" || face === "D") return face;
    if (face === spec.faces[0]) return "A";
    if (face === spec.faces[1]) return "B";
    if (face === opp[spec.faces[0]]) return "a";
    if (face === opp[spec.faces[1]]) return "b";
    return face;
  };
  const corner = [0, 1, 2].map((index) => `${local(faces.corner[cLoc][index])}=${role[hueAt(pattern, "CORNERS", cLoc, index)] ?? "?"}`);
  const edge = [0, 1].map((index) => `${local(faces.edge[eLoc][index])}=${role[hueAt(pattern, "EDGES", eLoc, index)] ?? "?"}`);
  const placed = cLoc === spec.corner || eLoc === spec.edge ? "in" : "out";
  return `${placed}|${corner.sort().join(",")}|${edge.sort().join(",")}`;
}

function locate(pattern: Pattern, orbit: Orbit, piece: number): number {
  const pieces = pattern.patternData[orbit].pieces;
  for (let loc = 0; loc < pieces.length; loc++) if (pieces[loc] === piece) return loc;
  return -1;
}

export function affected(pattern: Pattern, solved: Pattern): SlotId[] {
  return SLOTS.filter((slot) => {
    const spec = SLOT[slot];
    const corner = solved.patternData.CORNERS.pieces[spec.corner];
    const edge = solved.patternData.EDGES.pieces[spec.edge];
    const cLoc = locate(pattern, "CORNERS", corner);
    const eLoc = locate(pattern, "EDGES", edge);
    return cLoc !== spec.corner || eLoc !== spec.edge
      || pattern.patternData.CORNERS.orientation[cLoc] !== solved.patternData.CORNERS.orientation[spec.corner]
      || pattern.patternData.EDGES.orientation[eLoc] !== solved.patternData.EDGES.orientation[spec.edge];
  });
}

export async function solvedCube(): Promise<Pattern> {
  return home();
}

export function cubeKey(pattern: Pattern): string {
  return stateKey(pattern);
}

function stateKey(pattern: Pattern): string {
  return (["CORNERS", "EDGES", "CENTERS"] as const)
    .map((orbit) => {
      const data = pattern.patternData[orbit];
      return `${[...data.pieces].join(",")}:${[...data.orientation].join(",")}`;
    })
    .join("|");
}

export function crossSolved(pattern: Pattern, solved: Pattern): boolean {
  for (const loc of [4, 5, 6, 7]) {
    if (pattern.patternData.EDGES.pieces[loc] !== solved.patternData.EDGES.pieces[loc]) return false;
    if (pattern.patternData.EDGES.orientation[loc] !== solved.patternData.EDGES.orientation[loc]) return false;
  }
  return true;
}

export async function loadPattern(moves: string): Promise<Pattern> {
  const kp = await kpuzzle();
  return kp.defaultPattern().applyAlg(moves ? `z2 ${moves}` : "z2");
}

export function centersSolved(pattern: Pattern, solved: Pattern): boolean {
  const got = pattern.patternData.CENTERS;
  const want = solved.patternData.CENTERS;
  for (let loc = 0; loc < got.pieces.length; loc++) {
    if (got.pieces[loc] !== want.pieces[loc] || got.orientation[loc] !== want.orientation[loc]) return false;
  }
  return true;
}

export async function otherSlotsSolved(pattern: Pattern, slot: SlotId): Promise<boolean> {
  const solved = await home();
  return SLOTS.filter((item) => item !== slot).every((other) => !affected(pattern, solved).includes(other));
}
