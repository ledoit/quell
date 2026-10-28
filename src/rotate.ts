import { caseSetup, effectKey } from "./alg";
import { F2L } from "./data/f2l";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { lastLayer, type LlStickers } from "./ll";
import { quizOptions, refreshedQuizOptions, type QuizOption } from "./quiz";
import { loadPresentations, mirrorMoves, presentationsFor, type Presentation } from "./setups";
import type { CaseDef, SetId } from "./types";

/** Clockwise quarter turns of the top. The alg undoes that turn, so the picture and the moves stay one case. */
const TURNS = ["", "U", "U2", "U'"] as const;

/** Slots in a clockwise walk around the top. */
export const CLOCKWISE_SLOTS = ["FR", "BR", "BL", "FL"] as const;

const cycles = new Map<string, string[]>();

function undo(turn: string): string {
  if (turn === "U") return "U'";
  if (turn === "U'") return "U";
  if (turn === "U2") return "U2";
  return "";
}

function mod4(quarters: number): number {
  return ((quarters % 4) + 4) % 4;
}

/** Moves for the same case after `quarters` clockwise top-face turns. */
export function withAuf(moves: string, quarters: number): string {
  const lead = undo(TURNS[mod4(quarters)]);
  return lead ? `${lead} ${moves}` : moves;
}

function cycle(moves: string): string[] {
  const hit = cycles.get(moves);
  if (hit) return hit;
  const keys = [0, 1, 2, 3].map((quarter) => effectKey(withAuf(moves, quarter)));
  cycles.set(moves, keys);
  return keys;
}

/** Unturned alg in the same family. The list is ranked, so the first hit is that alg. */
export function familyBase(list: Presentation[], moves: string): string {
  const key = effectKey(moves);
  for (const item of list) {
    if (cycle(item.moves).includes(key)) return item.moves;
  }
  return moves;
}

export function quarterOf(list: Presentation[], moves: string): number {
  const key = effectKey(moves);
  const at = cycle(familyBase(list, moves)).indexOf(key);
  return at < 0 ? 0 : at;
}

export function presentationAt(list: Presentation[], moves: string, quarters: number): Presentation | undefined {
  const key = cycle(familyBase(list, moves))[mod4(quarters)];
  return list.find((item) => item.key === key);
}

export function movesAtQuarter(list: Presentation[], moves: string, quarters: number): string {
  return presentationAt(list, moves, quarters)?.moves ?? withAuf(familyBase(list, moves), quarters);
}

export function rotatePresentation(list: Presentation[], moves: string): Presentation | undefined {
  return presentationAt(list, moves, quarterOf(list, moves) + 1);
}

export function nextClockwiseSlot(list: Presentation[], label: string): Presentation | undefined {
  const at = CLOCKWISE_SLOTS.indexOf(label as (typeof CLOCKWISE_SLOTS)[number]);
  if (at < 0) return;
  const want = CLOCKWISE_SLOTS[(at + 1) % CLOCKWISE_SLOTS.length];
  return list.find((item) => item.picture === want);
}

/** One clockwise quarter, the same way a clockwise arrow turns the top. */
export function rotateStickers(ll: LlStickers): LlStickers {
  const order = [6, 3, 0, 7, 4, 1, 8, 5, 2];
  const spin = (perm: number[]) => [perm[1], perm[2], perm[3], perm[0]];
  return {
    u: order.map((index) => ll.u[index]),
    f: [...ll.r].reverse(),
    r: ll.b.slice(),
    b: [...ll.l].reverse(),
    l: ll.f.slice(),
    edgePerm: spin(ll.edgePerm),
    cornerPerm: spin(ll.cornerPerm),
  };
}

function shot(ll: LlStickers): string {
  const faces = [ll.u, ll.f, ll.r, ll.b, ll.l].map((row) => row.join("")).join("/");
  return `${faces}|${ll.edgePerm.join(",")}|${ll.cornerPerm.join(",")}`;
}

function fake(id: string, moves: string): CaseDef {
  return { id, name: id, group: "g", algs: [{ moves, label: "FR" }] };
}

function assertRefresh(): void {
  const sune = "R U R' U R U2 R'";
  const answer = fake("a", sune);
  const pool = [
    answer,
    fake("b", `${sune} U`),
    fake("c", "r U R' U R U2 r'"),
    fake("d", "F R U R' U' F'"),
    fake("e", "R' U' R U' R' U2 R"),
  ];
  const movesOf = (entry: CaseDef) => entry.algs[0]?.moves ?? "";
  const previous: QuizOption[] = [
    { id: "a", moves: sune },
    { id: "b", moves: movesOf(pool[1]) },
    { id: "c", moves: movesOf(pool[2]) },
  ];
  const after = refreshedQuizOptions(pool, answer, movesOf, previous);
  const ids = after.map((option) => option.id).sort();
  if (ids.join(",") !== "a,d,e") throw new Error(`rotation kept a shown algorithm (${ids.join(",")})`);

  const stuck = refreshedQuizOptions(pool.slice(0, 3), answer, movesOf, previous);
  if (stuck.length !== 3) throw new Error("rotation dropped a quiz row when nothing else was close");
}

function onlyCorrectChanged(before: QuizOption[], after: QuizOption[], answerId: string): boolean {
  const seen = new Set(before.map((option) => option.moves));
  const changed = after.filter((option) => !seen.has(option.moves));
  const kept = after.filter((option) => seen.has(option.moves));
  return kept.length > 0 && changed.length === 1 && changed[0]?.id === answerId;
}

async function assertCase(set: SetId, entry: CaseDef, pool: CaseDef[]): Promise<void> {
  const list = presentationsFor(set, entry.id);
  if (!list.length) throw new Error(`${set} ${entry.id} has no setup to rotate`);
  let moves = list[0].moves;
  let picture = await lastLayer(caseSetup(moves));
  const start = effectKey(moves);
  for (let step = 0; step < 4; step++) {
    const next = rotatePresentation(list, moves);
    if (!next) throw new Error(`${set} ${entry.id} has no clockwise quarter`);
    const layer = await lastLayer(caseSetup(next.moves));
    const spun = rotateStickers(picture);
    if (shot(layer) !== shot(spun)) throw new Error(`${set} ${entry.id} quarter ${step + 1} did not follow the arrow`);
    moves = next.moves;
    picture = layer;
  }
  if (effectKey(moves) !== start) throw new Error(`${set} ${entry.id} did not return after four quarters`);

  const mirrored = list.find((item) => item.key === effectKey(mirrorMoves(list[0].moves)));
  if (mirrored) {
    let mirrorMovesNow = mirrored.moves;
    const mirrorStart = effectKey(mirrorMovesNow);
    for (let step = 0; step < 4; step++) {
      const next = rotatePresentation(list, mirrorMovesNow);
      if (!next) throw new Error(`${set} ${entry.id} mirror has no clockwise quarter`);
      mirrorMovesNow = next.moves;
    }
    if (effectKey(mirrorMovesNow) !== mirrorStart) throw new Error(`${set} ${entry.id} mirror did not return after four quarters`);
  }

  const at = (quarter: number) => (item: CaseDef) => {
    const rows = presentationsFor(set, item.id);
    return movesAtQuarter(rows, rows[0]?.moves ?? "", quarter);
  };
  for (let quarter = 1; quarter < 4; quarter++) {
    const before = quizOptions(pool, entry, at(quarter - 1));
    const after = refreshedQuizOptions(pool, entry, at(quarter), before);
    const correct = after.find((option) => option.id === entry.id);
    if (correct?.moves !== at(quarter)(entry)) throw new Error(`${set} ${entry.id} quiz answer is not the rotated case`);
    for (const option of after) {
      const item = pool.find((row) => row.id === option.id);
      if (!item || option.moves !== at(quarter)(item)) throw new Error(`${set} ${entry.id} quiz row is not at the rotated angle`);
    }
    if (onlyCorrectChanged(before, after, entry.id)) {
      throw new Error(`${set} ${entry.id} left the rotated answer as the only changed choice`);
    }
  }
}

function assertSlots(): void {
  const cj = presentationsFor("f2l", "32");
  let label = "FR";
  const walked: string[] = [];
  for (let step = 0; step < 4; step++) {
    const next = nextClockwiseSlot(cj, label);
    if (!next?.picture) throw new Error("F2L 32 lost a clockwise slot");
    walked.push(next.picture);
    label = next.picture;
  }
  if (walked.join(",") !== "BR,BL,FL,FR") throw new Error(`F2L 32 walked ${walked.join(",")}`);
  const plain = presentationsFor("f2l", "1");
  if (nextClockwiseSlot(plain, "FR")) throw new Error("F2L 1 invented a 90 degree slot");
  const vp = presentationsFor("f2l", "37");
  if (nextClockwiseSlot(vp, "BR")?.picture !== "BL") throw new Error("F2L 37 did not turn BR into BL");
  if (nextClockwiseSlot(vp, "BL")) throw new Error("F2L 37 turned past its last slot");
  if (!F2L.some((entry) => entry.id === "32")) throw new Error("F2L 32 is missing");
}

/** Quarter turns, slot turns, and quiz rows that all move with the answer. */
export async function verifyRotation(): Promise<void> {
  assertRefresh();
  await loadPresentations();
  assertSlots();
  await Promise.all(OLL.map((entry) => assertCase("oll", entry, OLL)));
  await Promise.all(PLL.map((entry) => assertCase("pll", entry, PLL)));
}
