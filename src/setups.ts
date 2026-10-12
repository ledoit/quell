import { cube3x3x3 } from "cubing/puzzles";
import { caseSetup, effectKey, flatAlg } from "./alg";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { lastLayer, type LlStickers } from "./ll";
import type { SetId } from "./types";

/** Left-right mirror. U and the side faces invert so a right alg becomes its left version. */
const MIRROR: Record<string, string> = {
  R: "L'",
  "R'": "L",
  R2: "L2",
  L: "R'",
  "L'": "R",
  L2: "R2",
  U: "U'",
  "U'": "U",
  U2: "U2",
  D: "D'",
  "D'": "D",
  D2: "D2",
  F: "F'",
  "F'": "F",
  F2: "F2",
  B: "B'",
  "B'": "B",
  B2: "B2",
  M: "M",
  "M'": "M'",
  M2: "M2",
  E: "E'",
  "E'": "E",
  E2: "E2",
  S: "S'",
  "S'": "S",
  S2: "S2",
  r: "l'",
  "r'": "l",
  r2: "l2",
  l: "r'",
  "l'": "r",
  l2: "r2",
  u: "u'",
  "u'": "u",
  u2: "u2",
  d: "d'",
  "d'": "d",
  d2: "d2",
  f: "f'",
  "f'": "f",
  f2: "f2",
  b: "b'",
  "b'": "b",
  b2: "b2",
  x: "x'",
  "x'": "x",
  x2: "x2",
  y: "y'",
  "y'": "y",
  y2: "y2",
  z: "z'",
  "z'": "z",
  z2: "z2",
};

const STARTS = ["", "U", "U'", "U2"] as const;

export type Presentation = {
  moves: string;
  key: string;
  picture: string;
};

const boards = new Map<string, Presentation[]>();
let pending: Promise<void> | null = null;

export function mirrorMoves(moves: string): string {
  return moves.replace(/[A-Za-z](?:2'|2|')?/g, (token) => {
    const face = token[0];
    const suffix = token.slice(1) === "2'" ? "2" : token.slice(1);
    const mirrored = MIRROR[face + suffix];
    if (!mirrored) throw new Error(`no left version of ${token}`);
    return mirrored;
  });
}

function undo(turn: string): string {
  if (turn === "U") return "U'";
  if (turn === "U'") return "U";
  if (turn === "U2") return "U2";
  return "";
}

/** Alg you perform after the top face has already been turned by `turn`. */
function withStart(moves: string, turn: string): string {
  const lead = undo(turn);
  return lead ? `${lead} ${moves}` : moves;
}

function pictureOf(ll: LlStickers): string {
  return [ll.u, ll.f, ll.r, ll.b, ll.l].map((row) => row.join("")).join("/");
}

type OrbitData = { pieces: ArrayLike<number>; orientation: ArrayLike<number> };

type Cube = {
  patternData: { CORNERS: OrbitData; EDGES: OrbitData };
  applyAlg: (alg: string) => Cube;
};

function nums(values: ArrayLike<number>, count: number): number[] {
  return Array.from(values).slice(0, count);
}

function layerKey(pattern: Cube, orientOnly: boolean): string {
  const corners = pattern.patternData.CORNERS;
  const edges = pattern.patternData.EDGES;
  const co = nums(corners.orientation, 4).join(",");
  const eo = nums(edges.orientation, 4).join(",");
  if (orientOnly) return `${co}|${eo}`;
  return `${nums(corners.pieces, 4).join(",")}|${co}|${nums(edges.pieces, 4).join(",")}|${eo}`;
}

function cube(pattern: unknown): Cube {
  return pattern as Cube;
}

export function presentationsFor(set: SetId, id: string): Presentation[] {
  return boards.get(`${set}:${id}`) ?? [];
}

export function presentationBoards(): Map<string, Presentation[]> {
  return boards;
}

export function loadPresentations(): Promise<void> {
  pending ??= buildPresentations();
  return pending;
}

async function buildPresentations(): Promise<void> {
  const kp = await cube3x3x3.kpuzzle();
  const solved = cube(kp.defaultPattern().applyAlg("z2"));
  const owner = new Map<string, string>();

  const claim = (set: SetId, id: string, moves: string) => {
    const picture = solved.applyAlg(caseSetup(moves));
    const orientOnly = set === "oll";
    for (const turn of STARTS) {
      const turned = turn ? picture.applyAlg(turn) : picture;
      const key = layerKey(turned, orientOnly);
      const name = `${set}:${id}`;
      const prior = owner.get(key);
      if (prior && prior !== name) throw new Error(`${name} shares an angle with ${prior}`);
      owner.set(key, name);
    }
  };

  for (const entry of OLL) claim("oll", entry.id, entry.algs[0].moves);
  for (const entry of PLL) claim("pll", entry.id, entry.algs[0].moves);

  type Draft = Presentation & { score: number };
  const bags = new Map<string, Map<string, Draft>>();

  const consider = async (
    origin: string,
    moves: string,
    turn: string,
    left: boolean,
  ) => {
    const shown = withStart(moves, turn);
    for (const token of flatAlg(shown).split(" ")) {
      if (/^[xyz](?:2|')?$/.test(token)) throw new Error(`${shown} still has a cube rotation`);
    }
    const setup = caseSetup(shown);
    const ll = await lastLayer(setup);
    const picture = solved.applyAlg(setup);
    const orientOnly = origin.startsWith("oll:");
    const name = owner.get(layerKey(picture, orientOnly));
    if (!name) {
      if (!left) throw new Error(`no case is solved by ${shown}`);
      return;
    }
    if (name.startsWith("oll:") !== orientOnly) throw new Error(`${shown} crossed OLL and PLL`);
    const base = await lastLayer(caseSetup(moves));
    if (turn && pictureOf(ll) === pictureOf(base)) return;
    const key = effectKey(shown);
    let score = 0;
    if (!turn) score += 10;
    if (!left) score += 5;
    if (left && !turn) score += 3;
    if (origin === name && !left && !turn) score += 100;
    score -= shown.length / 10000;
    const bag = bags.get(name) ?? new Map<string, Draft>();
    const prior = bag.get(key);
    if (!prior || score > prior.score) {
      bag.set(key, { moves: shown, key, picture: pictureOf(ll), score });
    }
    bags.set(name, bag);
  };

  const sources: { set: SetId; id: string; moves: string }[] = [
    ...OLL.map((entry) => ({ set: "oll" as const, id: entry.id, moves: entry.algs[0].moves })),
    ...PLL.map((entry) => ({ set: "pll" as const, id: entry.id, moves: entry.algs[0].moves })),
  ];

  for (const source of sources) {
    const mirrored = mirrorMoves(source.moves);
    if (effectKey(mirrorMoves(mirrored)) !== effectKey(source.moves)) {
      throw new Error(`left mirror did not undo ${source.moves}`);
    }
    for (const turn of STARTS) {
      await consider(`${source.set}:${source.id}`, source.moves, turn, false);
      await consider(`${source.set}:${source.id}`, mirrored, turn, true);
    }
  }

  boards.clear();
  for (const [name, bag] of bags) {
    const list = [...bag.values()].sort((a, b) => b.score - a.score);
    boards.set(
      name,
      list.map(({ moves, key, picture }) => ({ moves, key, picture })),
    );
  }

  for (const source of sources) {
    const name = `${source.set}:${source.id}`;
    const list = boards.get(name);
    if (!list?.length) throw new Error(`${name} has no setup`);
    if (list[0].moves !== source.moves) throw new Error(`${name} default is not its standard alg`);
  }
}
