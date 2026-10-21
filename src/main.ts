import { effectKey, flatAlg, caseSetup } from "./alg";
import { F2L } from "./data/f2l";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { faceHtml } from "./face";
import { caseArrangements, cachedLayer, colorSchemes, lastLayer, recolor, sideKey, type LlStickers, type Scheme } from "./ll";
import { findPattern, patternsFor, type PatternDef } from "./patterns";
import type { SlotId } from "./slot";
import { stillHtml, stillStickers, stillUrl } from "./still";
import { anotherCase, quizOptions, type QuizOption } from "./quiz";
import { loadPresentations, presentationsFor } from "./setups";
import "./style.css";
import { verifyCases } from "./truth";
import type { CaseDef, SetId } from "./types";

type Look = "soft" | "hard";
type SetupPrefs = Record<string, string>;

const LOOK_KEY = "quell-look";
const FACES_KEY = "quell-faces";
const SETUP_KEY = "quell-setup";
const MIX_KEY = "quell-f2l-mix";
const DEFAULT_MIX = ["wide", "front", "extract", "splitter"];

const app = document.querySelector<HTMLElement>("#app")!;
const grid = document.querySelector<HTMLElement>("#grid")!;
const back = document.querySelector<HTMLButtonElement>("#back")!;
const menu = document.querySelector<HTMLElement>("#menu")!;
const menuBtn = document.querySelector<HTMLButtonElement>("#menu-btn")!;
const facesBtn = document.querySelector<HTMLButtonElement>("#menu [data-faces]")!;
const alg = document.querySelector<HTMLElement>("#alg")!;
const who = alg.querySelector<HTMLElement>(".who")!;
const algFace = alg.querySelector<HTMLElement>(".alg-face")!;
const setupsEl = alg.querySelector<HTMLElement>(".setups")!;

const arrangements = new Map<string, LlStickers[]>();
const shown = new Map<string, LlStickers>();
const shownFlat = new Map<string, string>();
const stills = new Map<string, Awaited<ReturnType<typeof stillStickers>>>();

type Quiz = { caseId: string; options: QuizOption[]; picked: string | null };

let set: SetId = "oll";
let patternId: string | null = null;
let caseId: string | null = null;
let look: Look = readLook();
let facesOn = readFaces();
let setupPrefs: SetupPrefs = readSetups();
let mix: string[] = readMix();
let schemes: Scheme[] = [];
let quiz: Quiz | null = null;
let quizMarkAt = 0;
let quizAdvance = 0;
const CORRECT_BEAT = 640;
let viewToken = 0;
let rolledToken = -1;
let schemeStamp = -1;
const schemeOf = new Map<string, number>();

document.documentElement.dataset.look = look;
app.dataset.look = look;
syncFaces();

function readLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === "hard" ? "hard" : "soft";
  } catch {
    return "soft";
  }
}

function readFaces(): boolean {
  try {
    return localStorage.getItem(FACES_KEY) === "on";
  } catch {
    return false;
  }
}

function readSetups(): SetupPrefs {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: SetupPrefs = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function readMix(): string[] {
  try {
    const raw = localStorage.getItem(MIX_KEY);
    if (!raw) return [...DEFAULT_MIX];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_MIX];
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [...DEFAULT_MIX];
  }
}

function writeMix(): void {
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    /* private mode */
  }
}

function writeSetups(): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setupPrefs));
  } catch {
    /* private mode */
  }
}

function stopQuizAdvance(): void {
  window.clearTimeout(quizAdvance);
  quizAdvance = 0;
}

function ask(avoid: string | null = quiz?.caseId ?? null): void {
  stopQuizAdvance();
  const pool = quizPool();
  const answer = anotherCase(pool, avoid);
  quiz = {
    caseId: answer.id,
    options: quizOptions(pool, answer, (entry) => chosenMoves(set, entry.id)),
    picked: null,
  };
  viewToken += 1;
}

function quizPool(): CaseDef[] {
  const all = casesFor(set);
  if (set !== "f2l") return all;
  if (patternId) {
    const ids = new Set(findPattern(set, patternId)?.ids ?? []);
    return all.filter((entry) => ids.has(entry.id));
  }
  const chosen = mix.length ? mix : patternsFor("f2l").map((skill) => skill.id);
  const ids = new Set(patternsFor("f2l").filter((skill) => chosen.includes(skill.id)).flatMap((skill) => skill.ids));
  return all.filter((entry) => ids.has(entry.id));
}

function chosenMoves(current: SetId, id: string): string {
  const entry = caseById(current, id);
  const fallback = entry?.algs[0]?.moves ?? "";
  const list = presentationsFor(current, id);
  const stored = setupPrefs[`${current}:${id}`];
  const hit = stored ? list.find((item) => item.key === stored) : undefined;
  return hit?.moves ?? list[0]?.moves ?? fallback;
}

function bagKey(current: SetId, id: string, moves: string): string {
  return `${current}:${id}:${flatAlg(moves)}`;
}

function visibleIds(): string[] {
  if (quiz) return [quiz.caseId];
  if (patternId) {
    const pattern = findPattern(set, patternId);
    return pattern ? pattern.ids : [];
  }
  return patternsFor(set).map((pattern) => pattern.ids[0]);
}

function baseFace(current: SetId, id: string): LlStickers | undefined {
  const moves = chosenMoves(current, id);
  const flat = flatAlg(moves);
  const key = `${current}:${id}`;
  const rolled = shown.get(key);
  if (rolled && shownFlat.get(key) === flat) return rolled;
  return cachedLayer(caseSetup(moves));
}

function paint(current: SetId, id: string, ll: LlStickers | undefined): LlStickers | undefined {
  if (!ll || !facesOn) return ll;
  const scheme = schemes[schemeOf.get(`${current}:${id}`) ?? 0];
  return scheme ? recolor(ll, scheme) : ll;
}

function chosenSlot(id: string): SlotId {
  const list = presentationsFor("f2l", id);
  const stored = setupPrefs[`f2l:${id}`];
  const hit = stored ? list.find((item) => item.key === stored) : undefined;
  const label = hit?.picture || list[0]?.picture || "FR";
  if (label === "FL" || label === "BR" || label === "BL") return label;
  return "FR";
}

function draw(current: SetId, id: string, marker: string): string {
  if (current === "f2l") {
    const slot = chosenSlot(id);
    const raw = stills.get(`${id}:${slot}`);
    const scheme = facesOn ? schemes[schemeOf.get(`${current}:${id}`) ?? 0] : undefined;
    return stillHtml(raw ? stillUrl(raw, slot, scheme, facesOn) : "");
  }
  return faceHtml(paint(current, id, baseFace(current, id)), current === "pll" ? "pll" : "oll", marker, facesOn);
}

function roll(current: SetId, ids: string[]): void {
  for (const id of ids) {
    const key = `${current}:${id}`;
    if (current !== "oll") {
      shown.delete(key);
      shownFlat.delete(key);
      continue;
    }
    const moves = chosenMoves(current, id);
    const bag = arrangements.get(bagKey(current, id, moves));
    if (!bag?.length) {
      shown.delete(key);
      shownFlat.delete(key);
      continue;
    }
    const prev = shownFlat.get(key) === flatAlg(moves) ? shown.get(key) : undefined;
    const others = bag.filter((ll) => !prev || sideKey(ll) !== sideKey(prev));
    const pool = others.length ? others : bag;
    shown.set(key, pool[Math.floor(Math.random() * pool.length)]);
    shownFlat.set(key, flatAlg(moves));
  }
}

function rollSchemes(current: SetId, ids: string[]): void {
  const count = schemes.length;
  if (count < 2) return;
  for (const id of ids) {
    const key = `${current}:${id}`;
    const prev = schemeOf.get(key);
    let next = Math.floor(Math.random() * count);
    if (next === prev) next = (next + 1 + Math.floor(Math.random() * (count - 1))) % count;
    schemeOf.set(key, next);
  }
}

function rollView(): void {
  const ids = visibleIds();
  if (rolledToken !== viewToken) {
    rolledToken = viewToken;
    schemeStamp = -1;
    roll(set, ids);
  }
  if (facesOn && schemeStamp !== viewToken) {
    schemeStamp = viewToken;
    rollSchemes(set, ids);
  }
}

function casesFor(current: SetId): CaseDef[] {
  if (current === "oll") return OLL;
  if (current === "f2l") return F2L;
  return PLL;
}

function caseById(current: SetId, id: string): CaseDef | undefined {
  return casesFor(current).find((entry) => entry.id === id);
}

function caseLabel(current: SetId, entry: CaseDef): string {
  if (current === "f2l") {
    const name = entry.name;
    const caption = entry.open ? `${name}, open` : name;
    return entry.reach ? `${caption} · ${entry.reach}` : caption;
  }
  return current === "oll" ? `OLL ${entry.id}` : entry.name;
}

function layout(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 8) return { cols: 4, rows: 2 };
  if (count <= 12) return { cols: 4, rows: 3 };
  if (count <= 16) return { cols: 4, rows: 4 };
  return { cols: 6, rows: 3 };
}

function gridFit(count: number): string {
  if (count <= 1) return "g1";
  if (count === 2) return "g2";
  if (count <= 4) return "g4";
  if (count <= 6) return "g6";
  if (count <= 8) return "g8";
  if (count <= 12) return "g12";
  if (count <= 16) return "g16";
  return "g18";
}

function fitLines(root: ParentNode, selector: string, widthRatio: number, heightRatio: number, floor: number): void {
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    const box = el.parentElement;
    if (!box || box.clientWidth < 20) continue;
    let size = Math.min(box.clientWidth * widthRatio, box.clientHeight * heightRatio);
    el.style.fontSize = `${size}px`;
    while (size > floor && (el.scrollHeight > box.clientHeight * 0.86 || el.scrollWidth > box.clientWidth * 0.94)) {
      size *= 0.92;
      el.style.fontSize = `${size}px`;
    }
  }
}

function fitOpts(): void {
  fitLines(grid, ".opt p", 0.2, 0.34, 15);
}

function fitSetups(): void {
  if (alg.hidden) return;
  fitLines(alg, ".setup p", 0.075, 0.46, 13);
}

function setMenu(open: boolean): void {
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function applyLook(next: Look): void {
  look = next;
  document.documentElement.dataset.look = next;
  app.dataset.look = next;
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (theme) theme.content = next === "hard" ? "#fbfbf8" : "#f3f2ee";
  try {
    localStorage.setItem(LOOK_KEY, next);
  } catch {
    /* private mode */
  }
  for (const button of menu.querySelectorAll<HTMLButtonElement>("[data-look]")) {
    button.classList.toggle("on", button.dataset.look === next);
  }
  requestAnimationFrame(fitSetups);
}

function syncFaces(): void {
  facesBtn.classList.toggle("on", facesOn);
  facesBtn.setAttribute("aria-pressed", facesOn ? "true" : "false");
}

function applyFaces(next: boolean): void {
  facesOn = next;
  syncFaces();
  try {
    localStorage.setItem(FACES_KEY, next ? "on" : "off");
  } catch {
    /* private mode */
  }
  if (next) schemeStamp = -1;
  render();
}

function setupButtons(current: SetId, id: string): string {
  const list = presentationsFor(current, id);
  const chosen = effectKey(chosenMoves(current, id));
  const rows = list.length ? list : [{ moves: chosenMoves(current, id), key: chosen, picture: "" }];
  return rows
    .map((item) => {
      const on = item.key === chosen ? " on" : "";
      return `<button type="button" class="setup${on}" data-setup="${encodeURIComponent(item.key)}"><p>${item.moves}</p></button>`;
    })
    .join("");
}

function render(): void {
  rollView();
  const pattern = patternId ? findPattern(set, patternId) : undefined;
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-set]")) {
    button.classList.toggle("on", button.dataset.set === set);
  }
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    button.classList.toggle("on", Boolean(quiz));
  }
  back.hidden = Boolean(quiz) || !pattern;
  back.textContent = pattern?.name ?? "";
  alg.hidden = true;

  if (quiz) {
    grid.dataset.fit = "quiz";
    grid.style.gridTemplateColumns = "";
    grid.style.gridTemplateRows = "";
    grid.innerHTML = quizHtml();
    requestAnimationFrame(fitOpts);
    return;
  }

  const selected = caseId ? caseById(set, caseId) : undefined;
  if (pattern && selected && caseId) {
    who.textContent = caseLabel(set, selected);
    algFace.innerHTML = draw(set, caseId, `a-${set}-${caseId}`);
    setupsEl.innerHTML = setupButtons(set, caseId);
    alg.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(fitSetups));
  }

  const cells = pattern ? caseCells(pattern) : patternCells();
  const { cols, rows } = layout(cells.length);
  grid.dataset.fit = gridFit(cells.length);
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  const blanks = cols * rows - cells.length;
  grid.innerHTML = cells.join("") + `<div class="cell blank"></div>`.repeat(blanks);
}

function quizHtml(): string {
  if (!quiz) return "";
  const entry = caseById(set, quiz.caseId);
  const label = entry ? caseLabel(set, entry) : quiz.caseId;
  const face = draw(set, quiz.caseId, `q-${set}-${quiz.caseId}`);
  const shownLabel = set === "f2l" ? "" : label;
  const options = quiz.options
    .map((option) => {
      const mark = quiz?.picked
        ? option.id === quiz.caseId
          ? " hit"
          : option.id === quiz.picked
            ? " miss"
            : ""
        : "";
      return `<button type="button" class="opt${mark}" data-opt="${option.id}"><p>${option.moves}</p></button>`;
    })
    .join("");
  const name = shownLabel ? `<span>${shownLabel}</span>` : "";
  const rows =
    quiz.options.length < 3
      ? ` style="grid-template-rows:repeat(${quiz.options.length},minmax(0,1fr))"`
      : "";
  return `<div class="quiz"><div class="quiz-face">${face}${name}</div><div class="quiz-opts"${rows}>${options}</div></div>`;
}

function patternCells(): string[] {
  return patternsFor(set).map((pattern) => {
    const sample = pattern.ids[0];
    const face = draw(set, sample, `p-${set}-${pattern.id}`);
    const mark = set === "f2l" ? `<i class="mix${mix.includes(pattern.id) ? " on" : ""}" data-mix="${pattern.id}"></i>` : "";
    return `<button type="button" class="cell" data-pattern="${pattern.id}">${face}<span>${pattern.name}${mark}</span></button>`;
  });
}

function caseCells(pattern: PatternDef): string[] {
  return pattern.ids.map((id) => {
    const entry = caseById(set, id);
    const label = entry ? (set === "f2l" ? entry.name : caseLabel(set, entry)) : id;
    const face = draw(set, id, `c-${set}-${id}`);
    const idClass = set === "pll" || set === "f2l" ? " id" : "";
    return `<button type="button" class="cell" data-case="${id}">${face}<span class="${idClass.trim()}">${label}</span></button>`;
  });
}

async function selectSetup(id: string, key: string): Promise<void> {
  const list = presentationsFor(set, id);
  const picked = list.find((item) => item.key === key);
  if (!picked) return;
  setupPrefs[`${set}:${id}`] = picked.key;
  writeSetups();
  if (set === "oll") {
    const setup = caseSetup(picked.moves);
    arrangements.set(bagKey(set, id, picked.moves), await caseArrangements(setup, flatAlg(picked.moves)));
  }
  shown.delete(`${set}:${id}`);
  shownFlat.delete(`${set}:${id}`);
  roll(set, [id]);
  render();
}

app.addEventListener("click", (event) => {
  const target = event.target as Element;
  if (quiz && target.closest("#grid")) {
    const option = target.closest<HTMLElement>("[data-opt]");
    if (!quiz.picked && option?.dataset.opt) {
      const picked = option.dataset.opt;
      quiz.picked = picked;
      quizMarkAt = performance.now();
      render();
      if (picked === quiz.caseId) {
        const marked = quiz;
        stopQuizAdvance();
        quizAdvance = window.setTimeout(() => {
          if (quiz !== marked) return;
          ask();
          render();
        }, CORRECT_BEAT);
      }
      return;
    }
    if (quiz.picked && quiz.picked !== quiz.caseId) {
      if (performance.now() - quizMarkAt < 350) return;
      ask();
      render();
    }
    return;
  }
  if (target.closest("#alg")) {
    const setupBtn = target.closest<HTMLButtonElement>("[data-setup]");
    if (setupBtn?.dataset.setup && caseId) {
      void selectSetup(caseId, decodeURIComponent(setupBtn.dataset.setup));
      return;
    }
    if (target.closest(".alg-card") && !target.closest(".close")) return;
    caseId = null;
    render();
    return;
  }
  if (target.closest("#menu-btn")) {
    setMenu(menu.hidden);
    return;
  }
  const lookBtn = target.closest<HTMLButtonElement>("#menu [data-look]");
  if (lookBtn?.dataset.look === "soft" || lookBtn?.dataset.look === "hard") {
    applyLook(lookBtn.dataset.look);
    setMenu(false);
    return;
  }
  if (target.closest("#menu [data-faces]")) {
    applyFaces(!facesOn);
    setMenu(false);
    return;
  }
  if (!target.closest("#menu")) setMenu(false);
  if (target.closest("[data-mode='quiz']")) {
    if (quiz) {
      stopQuizAdvance();
      quiz = null;
      viewToken += 1;
    } else {
      if (set !== "f2l") patternId = null;
      caseId = null;
      ask(null);
    }
    render();
    return;
  }
  if (target.closest("[data-set]")) {
    const next = target.closest<HTMLElement>("[data-set]")!.dataset.set;
    if (next !== "oll" && next !== "pll" && next !== "f2l") return;
    set = next;
    patternId = null;
    caseId = null;
    if (quiz) ask(null);
    else viewToken += 1;
    render();
    return;
  }
  if (target.closest("#back")) {
    patternId = null;
    caseId = null;
    viewToken += 1;
    render();
    return;
  }
  const mixBtn = target.closest<HTMLElement>("[data-mix]");
  if (mixBtn?.dataset.mix && set === "f2l" && !patternId && !quiz) {
    const skill = mixBtn.dataset.mix;
    mix = mix.includes(skill) ? mix.filter((item) => item !== skill) : [...mix, skill];
    writeMix();
    render();
    return;
  }
  const patternBtn = target.closest<HTMLElement>("[data-pattern]");
  if (patternBtn?.dataset.pattern) {
    patternId = patternBtn.dataset.pattern;
    caseId = null;
    viewToken += 1;
    render();
    return;
  }
  const caseBtn = target.closest<HTMLElement>("[data-case]");
  if (caseBtn?.dataset.case) {
    caseId = caseBtn.dataset.case;
    render();
  }
});

addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (quiz) {
    stopQuizAdvance();
    quiz = null;
    viewToken += 1;
    render();
    return;
  }
  if (!alg.hidden) {
    caseId = null;
    render();
    return;
  }
  setMenu(false);
});

addEventListener("resize", () => {
  fitSetups();
  fitOpts();
});

function checkTaxonomy(): void {
  const ollIds = OLL.map((entry) => entry.id);
  const pllIds = PLL.map((entry) => entry.id);
  const f2lIds = F2L.map((entry) => entry.id);
  const grouped = (ids: string[], patterns: PatternDef[]) => {
    const flat = patterns.flatMap((pattern) => pattern.ids);
    const missing = ids.filter((id) => !flat.includes(id));
    const extra = flat.filter((id) => !ids.includes(id));
    return missing.length === 0 && extra.length === 0 && new Set(flat).size === flat.length;
  };
  if (!grouped(ollIds, patternsFor("oll")) || !grouped(pllIds, patternsFor("pll")) || !grouped(f2lIds, patternsFor("f2l"))) {
    throw new Error("Case taxonomy does not cover OLL, PLL, and F2L exactly once");
  }
}

async function loadFaces(): Promise<void> {
  const jobs = [
    ...OLL.map((entry) => ({ set: "oll" as const, entry })),
    ...PLL.map((entry) => ({ set: "pll" as const, entry })),
  ];
  await Promise.all(
    F2L.flatMap((entry) =>
      entry.algs.map(async (alg) => {
        const slot: SlotId = alg.label === "FL" || alg.label === "BR" || alg.label === "BL" ? alg.label : "FR";
        stills.set(`${entry.id}:${slot}`, await stillStickers(alg.moves, slot));
      }),
    ),
  );
  await Promise.all(
    jobs.map(async ({ set: current, entry }) => {
      const moves = chosenMoves(current, entry.id);
      const setup = caseSetup(moves);
      await lastLayer(setup);
      if (current === "oll") arrangements.set(bagKey(current, entry.id, moves), await caseArrangements(setup, flatAlg(moves)));
    }),
  );
  rolledToken = -1;
  schemeStamp = -1;
  render();
}

checkTaxonomy();
applyLook(look);
void (async () => {
  schemes = await colorSchemes();
  await verifyCases();
  await loadPresentations();
  render();
  await loadFaces();
})();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
