import { closeness } from "./triggers";
import type { CaseDef } from "./types";

export type QuizOption = { id: string; moves: string };

function distractors(
  pool: CaseDef[],
  answer: CaseDef,
  count: number,
  movesOf: (entry: CaseDef) => string,
): CaseDef[] {
  const moves = movesOf(answer);
  return pool
    .filter((entry) => entry.id !== answer.id && movesOf(entry) !== moves)
    .map((entry) => ({ entry, score: closeness(moves, movesOf(entry)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((row) => row.entry);
}

export function quizOptions(
  pool: CaseDef[],
  answer: CaseDef,
  movesOf: (entry: CaseDef) => string = (entry) => entry.algs[0]?.moves ?? "",
): QuizOption[] {
  const options = [answer, ...distractors(pool, answer, 2, movesOf)].map((entry) => ({
    id: entry.id,
    moves: movesOf(entry),
  }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = options[i];
    options[i] = options[j];
    options[j] = swap;
  }
  return options;
}

export function anotherCase(pool: CaseDef[], avoid: string | null): CaseDef {
  const choices = pool.filter((entry) => entry.id !== avoid);
  const bag = choices.length ? choices : pool;
  return bag[Math.floor(Math.random() * bag.length)];
}
