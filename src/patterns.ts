import { F2L } from "./data/f2l";
import type { SkillId } from "./types";

export type PatternDef = {
  id: string;
  name: string;
  ids: string[];
};

const F2L_SKILL_ORDER: { id: SkillId; name: string }[] = [
  { id: "basic", name: "Basic" },
  { id: "wide", name: "Wide" },
  { id: "front", name: "Front" },
  { id: "extract", name: "Extract" },
  { id: "splitter", name: "Setup" },
];

/** Five skills. Setup is the splitter id. */
export const F2L_SKILLS: PatternDef[] = F2L_SKILL_ORDER.map((skill) => ({
  id: skill.id,
  name: skill.name,
  ids: F2L.filter((entry) => entry.skill === skill.id).map((entry) => entry.id),
}));

/** Fifteen OLL shapes. Every case sits in one of them. */
export const OLL_PATTERNS: PatternDef[] = [
  { id: "dot", name: "Dot", ids: ["1", "2", "3", "4", "17", "18", "19", "20"] },
  { id: "line", name: "Line", ids: ["51", "52", "55", "56"] },
  { id: "cross", name: "Cross", ids: ["21", "22", "23", "24", "25", "26", "27"] },
  { id: "corners", name: "Corners", ids: ["28", "57"] },
  { id: "small-l", name: "Small L", ids: ["47", "48", "49", "50", "53", "54"] },
  { id: "big-l", name: "Big L", ids: ["13", "14", "15", "16"] },
  { id: "lightning", name: "Lightning", ids: ["7", "8", "11", "12"] },
  { id: "z", name: "Z", ids: ["39", "40"] },
  { id: "fish", name: "Fish", ids: ["9", "10", "35", "37"] },
  { id: "awkward", name: "Awkward", ids: ["29", "30", "41", "42"] },
  { id: "w", name: "W", ids: ["36", "38"] },
  { id: "p", name: "P", ids: ["31", "32", "43", "44"] },
  { id: "t", name: "T", ids: ["33", "45"] },
  { id: "c", name: "C", ids: ["34", "46"] },
  { id: "square", name: "Square", ids: ["5", "6"] },
];

/** PLL by letter. A one-case letter still opens its case grid. */
export const PLL_PATTERNS: PatternDef[] = [
  { id: "A", name: "A", ids: ["Aa", "Ab"] },
  { id: "E", name: "E", ids: ["E"] },
  { id: "F", name: "F", ids: ["F"] },
  { id: "G", name: "G", ids: ["Ga", "Gb", "Gc", "Gd"] },
  { id: "H", name: "H", ids: ["H"] },
  { id: "J", name: "J", ids: ["Ja", "Jb"] },
  { id: "N", name: "N", ids: ["Na", "Nb"] },
  { id: "R", name: "R", ids: ["Ra", "Rb"] },
  { id: "T", name: "T", ids: ["T"] },
  { id: "U", name: "U", ids: ["Ua", "Ub"] },
  { id: "V", name: "V", ids: ["V"] },
  { id: "Y", name: "Y", ids: ["Y"] },
  { id: "Z", name: "Z", ids: ["Z"] },
];

export function patternsFor(set: "oll" | "pll" | "f2l"): PatternDef[] {
  if (set === "oll") return OLL_PATTERNS;
  if (set === "f2l") return F2L_SKILLS;
  return PLL_PATTERNS;
}

export function findPattern(set: "oll" | "pll" | "f2l", id: string): PatternDef | undefined {
  return patternsFor(set).find((pattern) => pattern.id === id);
}
