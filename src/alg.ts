import { Alg } from "cubing/alg";

/** Moves cubing can apply. Parentheses are grouping; `2'` is a half turn. */
export function flatAlg(moves: string): string {
  return moves.replace(/[()]/g, " ").replace(/2'/g, "2").replace(/\s+/g, " ").trim();
}

/** Inverse of the stored alg, which is the case the diagram draws. */
export function caseSetup(moves: string): string {
  return new Alg(flatAlg(moves)).invert().simplify({ cancel: true }).toString();
}

/** Same physical alg, ignoring grouping and cancelled turns. */
export function effectKey(moves: string): string {
  return new Alg(flatAlg(moves)).simplify({ cancel: true }).toString();
}
