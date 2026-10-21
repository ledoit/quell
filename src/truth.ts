import { cube3x3x3 } from "cubing/puzzles";
import { caseSetup, effectKey, flatAlg } from "./alg";
import { CASE_LOCK } from "./data/lock";
import { F2L } from "./data/f2l";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { caseArrangements, colorSchemes, lastLayer, OPPOSITE, recolor, topMask, yellowMask, type Hue, type LlStickers } from "./ll";
import { centersSolved, crossSolved, cubeKey, loadPattern, pairSig, solvedCube } from "./slot";
import { loadPresentations, mirrorMoves, presentationBoards } from "./setups";
import type { CaseDef, SetId } from "./types";

export { caseSetup, flatAlg };

const ROTATION = /^[xyz](?:2|')?$/;

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

  const schemes = await colorSchemes();
  const hues: Hue[] = ["Y", "W", "G", "B", "R", "O"];
  if (schemes.length !== 24) throw new Error("expected 24 color schemes");
  if (!schemes.some((scheme) => hues.every((hue) => scheme[hue] === hue))) throw new Error("standard grip is missing");
  if (!schemes.some((scheme) => scheme.Y !== "Y")) throw new Error("every grip keeps yellow on top");
  if (!schemes.some((scheme) => scheme.Y === "Y" && scheme.G !== "G")) throw new Error("yellow-up grips never change the front");
  const shapeOf = new Map(shapes.map((shape) => [shape.id, shape.keys]));
  await loadPresentations();
  const boards = presentationBoards();
  let angled = 0;
  for (const [id, list] of boards) {
    if (!list.length) throw new Error(`${id} has no setup`);
    const pictures = new Set<string>();
    for (const item of list) {
      pictures.add(item.picture);
      for (const token of flatAlg(item.moves).split(" ")) {
        if (ROTATION.test(token)) throw new Error(`${id} setup still has a cube rotation`);
      }
      const picture = cube(yellow.applyAlg(caseSetup(item.moves)));
      if (stateKey(picture.applyAlg(flatAlg(item.moves))) !== solvedKey) {
        throw new Error(`${id} setup does not solve the case it draws`);
      }
      const keys = shapeOf.get(id);
      if (!keys?.has(layerKey(picture, id.startsWith("oll:")))) {
        throw new Error(`${id} setup is a different case`);
      }
    }
    if (pictures.size > 1) angled += 1;
  }
  if (angled < 1) throw new Error("no case has another top-face start");
  const sune = OLL.find((entry) => entry.id === "27");
  const leftSune = effectKey(mirrorMoves(sune?.algs[0]?.moves ?? ""));
  let landed = "none";
  for (const [id, list] of boards) {
    if (list.some((item) => item.key === leftSune)) landed = id;
  }
  if (landed !== "oll:26") throw new Error(`left sune landed on ${landed}`);
  const ua = PLL.find((entry) => entry.id === "Ua");
  const leftUa = effectKey(mirrorMoves(ua?.algs[0]?.moves ?? ""));
  const pllHome = [...boards.entries()].filter(([, list]) => list.some((item) => item.key === leftUa)).map(([id]) => id);
  if (!pllHome.some((id) => id === "pll:Ua" || id === "pll:Ub")) {
    throw new Error(`left Ua landed on ${pllHome.join(", ") || "none"}`);
  }
  for (const entry of OLL) {
    const variants = await caseArrangements(caseSetup(entry.algs[0].moves), flatAlg(entry.algs[0].moves));
    for (const variant of variants) {
      for (const scheme of schemes) {
        const painted = recolor(variant, scheme);
        if (topMask(painted) !== yellowMask(variant)) throw new Error(`oll:${entry.id} recolor moved the case`);
        if (painted.u.some((hue) => hue === OPPOSITE[painted.u[4]])) {
          throw new Error(`oll:${entry.id} recolor puts the opposite color on top`);
        }
      }
    }
  }
  await verifyF2l();
  if (!ua) throw new Error("Ua is missing");
  const uaPicture = await lastLayer(caseSetup(ua.algs[0].moves));
  for (const scheme of schemes) {
    const painted = recolor(uaPicture, scheme);
    if (painted.u.some((hue) => hue !== painted.u[4])) throw new Error("Ua recolor split the top face");
    if (painted.edgePerm.join(",") !== uaPicture.edgePerm.join(",")) throw new Error("Ua recolor moved a piece");
  }
}

const F2L_FACE = new Set(["U", "R", "L", "r", "l", "M"]);

async function verifyF2l(): Promise<void> {
  const solved = await solvedCube();
  const solvedKey = cubeKey(solved);
  const seen = new Map<string, string>();
  if (F2L.length !== 41) throw new Error(`expected 41 F2L cases, found ${F2L.length}`);
  for (const entry of F2L) {
    const id = `f2l:${entry.id}`;
    if (!entry.skill || !entry.caption || !entry.algs.length) throw new Error(`${id} is missing its skill`);
    const sigs = new Set<string>();
    for (const [index, alg] of entry.algs.entries()) {
      const moves = flatAlg(alg.moves);
      for (const token of moves.split(" ")) {
        if (!token) continue;
        if (!F2L_FACE.has(token[0]) && !(entry.open && index === 0)) throw new Error(`${id} ${alg.label} uses ${token}`);
      }
      const picture = await loadPattern(caseSetup(moves));
      const after = picture.applyAlg(moves);
      if (cubeKey(after) !== solvedKey) throw new Error(`${id} ${alg.label} does not solve the case it draws`);
      if (!centersSolved(picture, solved) || !crossSolved(picture, solved)) throw new Error(`${id} ${alg.label} breaks the cross or the centers`);
      const sig = await pairSig(moves);
      if (!sig) throw new Error(`${id} ${alg.label} does not leave exactly one pair`);
      sigs.add(sig);
      if (index === 0) {
        const prior = seen.get(sig);
        if (prior) throw new Error(`${id} draws the same pair as ${prior}`);
        seen.set(sig, id);
      }
    }
    if (sigs.size !== 1) throw new Error(`${id} slot rows are different cases`);
    const open = flatAlg(entry.algs[0].moves).split(" ").some((token) => token && !F2L_FACE.has(token[0]));
    if (Boolean(entry.open) !== open) throw new Error(`${id} open flag does not match its algorithm`);
  }
}
