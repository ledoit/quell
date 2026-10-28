import { closeness } from "./triggers";
import type { CaseDef } from "./types";

export type QuizOption = { id: string; moves: string };

function ranked(
  pool: CaseDef[],
  answer: CaseDef,
  movesOf: (entry: CaseDef) => string,
): CaseDef[] {
  const moves = movesOf(answer);
  return pool
    .filter((entry) => entry.id !== answer.id && movesOf(entry) !== moves)
    .map((entry) => ({ entry, score: closeness(moves, movesOf(entry)) }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.entry);
}

function shuffled(options: QuizOption[]): QuizOption[] {
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = options[i];
    options[i] = options[j];
    options[j] = swap;
  }
  return options;
}

function rowsOf(entries: CaseDef[], movesOf: (entry: CaseDef) => string): QuizOption[] {
  return shuffled(entries.map((entry) => ({ id: entry.id, moves: movesOf(entry) })));
}

export function quizOptions(
  pool: CaseDef[],
  answer: CaseDef,
  movesOf: (entry: CaseDef) => string = (entry) => entry.algs[0]?.moves ?? "",
): QuizOption[] {
  return rowsOf([answer, ...ranked(pool, answer, movesOf).slice(0, 2)], movesOf);
}

/**
 * New rows for a rotated answer. Skips algorithms still on screen when a
 * different neighbor exists, so the turned answer is not the only new row.
 */
export function refreshedQuizOptions(
  pool: CaseDef[],
  answer: CaseDef,
  movesOf: (entry: CaseDef) => string,
  previous: QuizOption[],
): QuizOption[] {
  const avoid = new Set(previous.map((option) => option.moves));
  avoid.delete(movesOf(answer));
  const rows = ranked(pool, answer, movesOf);
  const fresh = rows.filter((entry) => !avoid.has(movesOf(entry)));
  const picked = fresh.slice(0, 2);
  if (picked.length < 2) {
    for (const entry of rows) {
      if (picked.length >= 2) break;
      if (picked.some((item) => item.id === entry.id)) continue;
      picked.push(entry);
    }
  }
  return rowsOf([answer, ...picked], movesOf);
}

export function anotherCase(pool: CaseDef[], avoid: string | null): CaseDef {
  const choices = pool.filter((entry) => entry.id !== avoid);
  const bag = choices.length ? choices : pool;
  return bag[Math.floor(Math.random() * bag.length)];
}
