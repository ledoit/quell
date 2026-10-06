import { Alg } from "cubing/alg";
import { OLL } from "./data/oll";
import { PLL } from "./data/pll";
import { faceHtml } from "./face";
import { lastLayer, type LlStickers } from "./ll";
import { findPattern, patternsFor, type PatternDef } from "./patterns";
import "./style.css";
import type { CaseDef, SetId } from "./types";

type Look = "soft" | "hard";

const LOOK_KEY = "quell-look";

const app = document.querySelector<HTMLElement>("#app")!;
const grid = document.querySelector<HTMLElement>("#grid")!;
const back = document.querySelector<HTMLButtonElement>("#back")!;
const menu = document.querySelector<HTMLElement>("#menu")!;
const menuBtn = document.querySelector<HTMLButtonElement>("#menu-btn")!;
const alg = document.querySelector<HTMLElement>("#alg")!;
const who = alg.querySelector<HTMLElement>(".who")!;
const movesEl = alg.querySelector<HTMLElement>(".moves")!;

const faces = new Map<string, LlStickers>();

let set: SetId = "oll";
let patternId: string | null = null;
let caseId: string | null = null;
let look: Look = readLook();

document.documentElement.dataset.look = look;
app.dataset.look = look;

function readLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === "hard" ? "hard" : "soft";
  } catch {
    return "soft";
  }
}

function setupAlg(moves: string): string {
  const flat = moves.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  return new Alg(flat).invert().simplify({ cancel: true }).toString();
}

function casesFor(current: SetId): CaseDef[] {
  return current === "oll" ? OLL : PLL;
}

function caseById(current: SetId, id: string): CaseDef | undefined {
  return casesFor(current).find((entry) => entry.id === id);
}

function caseLabel(current: SetId, entry: CaseDef): string {
  return current === "oll" ? `OLL ${entry.id}` : entry.name;
}

function layout(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 8) return { cols: 4, rows: 2 };
  if (count <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 };
}

function gridFit(count: number): string {
  if (count <= 1) return "g1";
  if (count === 2) return "g2";
  if (count <= 4) return "g4";
  if (count <= 6) return "g6";
  if (count <= 8) return "g8";
  if (count <= 12) return "g12";
  return "g16";
}

function fitAlg(): void {
  if (alg.hidden || alg.clientWidth < 40) return;
  let size = Math.min(alg.clientWidth * 0.078, alg.clientHeight * 0.2);
  movesEl.style.fontSize = `${size}px`;
  const maxH = alg.clientHeight * 0.62;
  while (size > 18 && movesEl.scrollHeight > maxH) {
    size *= 0.9;
    movesEl.style.fontSize = `${size}px`;
  }
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
  requestAnimationFrame(fitAlg);
}

function render(): void {
  const pattern = patternId ? findPattern(set, patternId) : undefined;
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-set]")) {
    button.classList.toggle("on", button.dataset.set === set);
  }
  back.hidden = !pattern;
  back.textContent = pattern?.name ?? "";

  const selected = caseId ? caseById(set, caseId) : undefined;
  if (pattern && selected) {
    who.textContent = caseLabel(set, selected);
    movesEl.textContent = selected.algs[0]?.moves ?? "";
    alg.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(fitAlg));
  } else {
    alg.hidden = true;
  }

  const cells = pattern ? caseCells(pattern) : patternCells();
  const { cols, rows } = layout(cells.length);
  grid.dataset.fit = gridFit(cells.length);
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  const blanks = cols * rows - cells.length;
  grid.innerHTML = cells.join("") + `<div class="cell blank"></div>`.repeat(blanks);
}

function patternCells(): string[] {
  return patternsFor(set).map((pattern) => {
    const sample = pattern.ids[0];
    const face = faceHtml(faces.get(`${set}:${sample}`), set, `p-${set}-${pattern.id}`);
    return `<button type="button" class="cell" data-pattern="${pattern.id}">${face}<span>${pattern.name}</span></button>`;
  });
}

function caseCells(pattern: PatternDef): string[] {
  return pattern.ids.map((id) => {
    const entry = caseById(set, id);
    const label = entry ? caseLabel(set, entry) : id;
    const face = faceHtml(faces.get(`${set}:${id}`), set, `c-${set}-${id}`);
    const idClass = set === "pll" ? " id" : "";
    return `<button type="button" class="cell" data-case="${id}">${face}<span class="${idClass.trim()}">${label}</span></button>`;
  });
}

app.addEventListener("click", (event) => {
  const target = event.target as Element;
  if (target.closest("#alg")) {
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
  if (!target.closest("#menu")) setMenu(false);
  if (target.closest("[data-set]")) {
    const next = target.closest<HTMLElement>("[data-set]")!.dataset.set;
    if (next !== "oll" && next !== "pll") return;
    set = next;
    patternId = null;
    caseId = null;
    render();
    return;
  }
  if (target.closest("#back")) {
    patternId = null;
    caseId = null;
    render();
    return;
  }
  const patternBtn = target.closest<HTMLElement>("[data-pattern]");
  if (patternBtn?.dataset.pattern) {
    patternId = patternBtn.dataset.pattern;
    caseId = null;
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
  if (!alg.hidden) {
    caseId = null;
    render();
    return;
  }
  setMenu(false);
});

addEventListener("resize", fitAlg);

function checkTaxonomy(): void {
  const ollIds = OLL.map((entry) => entry.id);
  const pllIds = PLL.map((entry) => entry.id);
  const grouped = (ids: string[], patterns: PatternDef[]) => {
    const flat = patterns.flatMap((pattern) => pattern.ids);
    const missing = ids.filter((id) => !flat.includes(id));
    const extra = flat.filter((id) => !ids.includes(id));
    return missing.length === 0 && extra.length === 0 && new Set(flat).size === flat.length;
  };
  if (!grouped(ollIds, patternsFor("oll")) || !grouped(pllIds, patternsFor("pll"))) {
    throw new Error("Case taxonomy does not cover OLL and PLL exactly once");
  }
}

async function loadFaces(): Promise<void> {
  const jobs = [
    ...OLL.map((entry) => ({ set: "oll" as const, entry })),
    ...PLL.map((entry) => ({ set: "pll" as const, entry })),
  ];
  await Promise.all(
    jobs.map(async ({ set: current, entry }) => {
      const ll = await lastLayer(setupAlg(entry.algs[0].moves));
      faces.set(`${current}:${entry.id}`, ll);
    }),
  );
  render();
}

checkTaxonomy();
applyLook(look);
render();
void loadFaces();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
