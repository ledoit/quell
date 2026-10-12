import { Alg } from "cubing/alg";
import { cube3x3x3 } from "cubing/puzzles";
import { CASE_LOCK } from "./data/lock";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { caseArrangements, lastLayer, yellowMask, type LlStickers } from "./ll";
import type { CaseDef, SetId } from "./types";

const ROTATION = /^[xyz](?:2|')?$/;

/** Moves cubing can apply. Parentheses are grouping; `2'` is a half turn. */
export function flatAlg(moves: string): string {
  return moves.replace(/[()]/g, " ").replace(/2'/g, "2").replace(/\s+/g, " ").trim();
}

/** Inverse of the stored alg, which is the case the diagram draws. */
export function caseSetup(moves: string): string {
  return new Alg(flatAlg(moves)).invert().simplify({ cancel: true }).toString();
}

type OrbitData = { pieces: ArrayLike<number>; orientation: ArrayLike<number> };

type Cube = {
  patternData: { CORNERS: OrbitData; EDGES: OrbitData; CENTERS: OrbitData };
  applyAlg: (alg: string) => Cube;
};

function cube(pattern: unknown): Cube {
  return pattern as Cube;
}

function nums(values: ArrayLike<number>, count?: number): number[] {
  const list = Array.from(values);
  return count === undefined ? list : list.slice(0, count);
}

function stateKey(pattern: Cube): string {
  const data = pattern.patternData;
  return (["CORNERS", "EDGES", "CENTERS"] as const)
    .map((orbit) => `${nums(data[orbit].pieces).join(",")}:${nums(data[orbit].orientation).join(",")}`)
    .join("|");
}

function layerKey(pattern: Cube, orientOnly: boolean): string {
  const corners = pattern.patternData.CORNERS;
  const edges = pattern.patternData.EDGES;
  const co = nums(corners.orientation, 4).join(",");
  const eo = nums(edges.orientation, 4).join(",");
  if (orientOnly) return `${co}|${eo}`;
  return `${nums(corners.pieces, 4).join(",")}|${co}|${nums(edges.pieces, 4).join(",")}|${eo}`;
}

function view(ll: LlStickers): string {
  return [ll.u, ll.f, ll.r, ll.b, ll.l].map((row) => row.join("")).join("/");
}

function aufs(pattern: Cube, orientOnly: boolean): Set<string> {
  const keys = new Set<string>();
  for (const turn of ["", "U", "U'", "U2"]) {
    const turned = cube(turn ? pattern.applyAlg(turn) : pattern);
    keys.add(layerKey(turned, orientOnly));
  }
  return keys;
}

function overlap(a: Set<string>, b: Set<string>): boolean {
  for (const key of a) if (b.has(key)) return true;
  return false;
}

/**
 * Every stored algorithm is the SpeedCubeDB standard with cube rotations removed.
 * The drawn case is that algorithm's inverse, so the U-layer angle matches the moves.
 */
export async function verifyCases(): Promise<void> {
  const kp = await cube3x3x3.kpuzzle();
  const yellow = cube(kp.defaultPattern().applyAlg("z2"));
  const solvedKey = stateKey(yellow);
  const seen = new Map<string, string>();
  const shapes: { id: string; keys: Set<string> }[] = [];
  let flexible = 0;

  const check = async (set: SetId, entry: CaseDef) => {
    const moves = entry.algs[0]?.moves ?? "";
    const id = `${set}:${entry.id}`;
    for (const token of flatAlg(moves).split(" ")) {
      if (ROTATION.test(token)) throw new Error(`${id} still has a cube rotation (${token})`);
    }
    const picture = cube(yellow.applyAlg(caseSetup(moves)));
    if (stateKey(picture.applyAlg(flatAlg(moves))) !== solvedKey) {
      throw new Error(`${id} does not solve the case it draws`);
    }
    if (stateKey(picture).split("|")[2] !== solvedKey.split("|")[2]) {
      throw new Error(`${id} does not leave the centers in place`);
    }
    const diagram = view(await lastLayer(caseSetup(moves)));
    const locked = CASE_LOCK[id];
    if (!locked) throw new Error(`${id} has no sticker lock`);
    if (diagram !== locked) throw new Error(`${id} diagram drifted from the locked case`);
    if (seen.has(diagram)) throw new Error(`${id} draws the same case as ${seen.get(diagram)}`);
    seen.set(diagram, id);
    shapes.push({ id, keys: aufs(picture, set === "oll") });
    if (set === "oll") {
      const variants = await caseArrangements(caseSetup(moves), flatAlg(moves));
      const mask = yellowMask(await lastLayer(caseSetup(moves)));
      const sides = new Set<string>();
      for (const variant of variants) {
        if (yellowMask(variant) !== mask) throw new Error(`${id} arrangement moved a yellow sticker`);
        sides.add([variant.f, variant.r, variant.b, variant.l].map((row) => row.join("")).join("/"));
      }
      if (sides.size !== variants.length) throw new Error(`${id} arrangements are not distinct`);
      if (!sides.has(diagram.split("/").slice(1).join("/"))) {
        throw new Error(`${id} arrangements omit the locked side coloring`);
      }
      if (variants.length > 1) flexible += 1;
    }
  };

  await Promise.all([...OLL.map((entry) => check("oll", entry)), ...PLL.map((entry) => check("pll", entry))]);
  if (flexible < 1) throw new Error("no OLL has another side coloring");

  const ids = new Set([...OLL.map((entry) => `oll:${entry.id}`), ...PLL.map((entry) => `pll:${entry.id}`)]);
  for (const key of Object.keys(CASE_LOCK)) {
    if (!ids.has(key)) throw new Error(`${key} is locked but not a case`);
  }

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];
      const sameSet = a.id.startsWith("oll:") === b.id.startsWith("oll:");
      if (sameSet && overlap(a.keys, b.keys)) {
        throw new Error(`${a.id} and ${b.id} are the same case up to a U turn`);
      }
    }
  }
}
