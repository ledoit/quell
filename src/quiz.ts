import { closeness } from "./triggers";
import type { CaseDef } from "./types";

export type QuizOption = { id: string; moves: string };

function distractors(pool: CaseDef[], answer: CaseDef, count: number): CaseDef[] {
  const moves = answer.algs[0]?.moves ?? "";
  return pool
    .filter((entry) => entry.id !== answer.id && (entry.algs[0]?.moves ?? "") !== moves)
    .map((entry) => ({ entry, score: closeness(moves, entry.algs[0]?.moves ?? "") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((row) => row.entry);
}

export function quizOptions(pool: CaseDef[], answer: CaseDef): QuizOption[] {
  const options = [answer, ...distractors(pool, answer, 3)].map((entry) => ({
    id: entry.id,
    moves: entry.algs[0]?.moves ?? "",
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
