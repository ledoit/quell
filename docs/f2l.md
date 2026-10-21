# Quell — F2L

**Status:** Signed in chat 2026-10-21. The slot picture is an unsigned look. A build goes through Forge, then Capo. Soft and Hard stay. This cut does not add cross, xcross, or double xcross.

The earlier draft kept only the cases where a back turn, a front turn, or a buried corner shows up. That list is paused. F2L now holds all 41 SpeedCubeDB cases, filed by the technique of the algorithm you execute. A skill you already have stays in the file and starts outside the quiz.

## The picture

You duck a corner into its slot, walk its edge alongside, and bring the corner back up with the pair made. You also set an edge and a corner so a three-move insert joins them. A corner with the bottom color on top gets a basic flip. One wide insert is already in the hands: `r' U' R U M'`, for a made pair on the back row of the top face, above its slot.

The grid is five skills. Basic is the duck and the three-move insert, and it starts unmarked. Wide, Front, Extract, and Setup start marked. You open a skill to study it. You mark a skill to put it in the home quiz. Back-right and back-left are rows on the case card, the same case with the slot turned, so a back slot does not become a second copy of the 41.

The window is the same window. F2L sits beside OLL and PLL.

## How you use it

The header reads OLL, PLL, F2L, Quiz. F2L opens on five cells.

| Cell | Skill | What you are drilling |
|---|---|---|
| Basic | Inserts and ducking | `U R U' R'`, `R U R'`, and the ordinary hide-and-pair. Starts out of the quiz. |
| Wide | Back-slot mechanics | Wide and slice inserts: `r' U' R U M'`, `l U L' U' M'`, and the other `r` / `l` / `M` setups. |
| Front | Sledges and front inserts | Pictures whose public line is `F R' F' R`, `R' F R F'`, or `F' U' F`. The stored line is the `U` / `R` / `L` replacement. |
| Extract | Slot extraction | The corner, the edge, or both are already in the slot. `R2` / `L2` when that line is close to the shortest legal one. |
| Setup | Splitters | Pairs on top that need a special setup, including `R2` while both pieces are still up. |

A cell opens that skill's cases. A case opens one algorithm. OLL and PLL keep the flat face. F2L is a locked still of the cube. It does not drag, orbit, or change on hover. The front face is the large one. Left and right are a small yaw, so the side is the narrow face. A pair sticker on the back or the bottom is a facelet on that face's own plane, set just off the cube.

The case name is its BirdF2L code, the two letters Andrew Robbins assigns that picture (`Jb`, `Me`, `Vp`). SpeedCubeDB only numbers the same 41, and its group names are not one name per case. The card shows that code. When the public line turns `F` or `B` and the stored line does not, a second line quotes that public trigger, `F R' F' R` or `B U B'`. An open case adds `, open`. The quiz shows the picture and the three algorithms. The skill you opened is the intent.

Under the algorithm, the other rows are the other three slots, when a legal algorithm solves that slot. Front-right is the default. The row that is on matches the picture. Two algorithms are not shown at once. Tap outside the card to return. The skill name in the corner returns to the five cells.

Each skill cell carries a mark. The mark is the quiz mix. Basic starts clear. The other four start marked. The body of the cell opens the skill. The mark toggles membership. That is the whole multi-skill control.

Quiz from inside a skill drills that skill, mark or not. Quiz from the five-cell grid drills every marked skill together. A right tap turns green and the next case follows. A wrong tap turns red, the right row turns green, and the next case waits for a tap. If every mark is clear, Quiz from the grid drills all five, so the button still has a pool.

Faces off colors the pair, the cross edges, and the centers. The other stickers stay grey. Faces on colors every sticker, in the grip that is on, including the bottom color on a hover. OLL with Faces off is yellow where the sticker is yellow and grey everywhere else, including the side ring. Soft and Hard stay in the menu. There is no score, timer, search, or account.

## Where the 41 sit

One case, one skill. The skill is the technique of the stored algorithm, with two exceptions that keep a practice section from going empty: a case whose public line uses `F` stays in Front when the stored line is ordinary `U` / `R` / `L`, and a case with a piece already in the slot stays in Extract even when the stored line is wide.

The filing below is what those rules produce from the current public lists. `verifyCases` recomputes it. A better legal algorithm moves the case with the rules.

**Basic.** 1, 4, 5, 10, 14, 17, 19, 21.

**Wide.** 2, 6, 7, 8, 11, 13, 15, 16, 18, 20, 22. 2 is the sledge picture, and the line that solves that same pair is `l U L' U' M'` on the back-left. 16 is `U M' U R U' r' U' R U R'`.

**Front.** 3, 9, 24. These three still have no legal same-picture line, so the card keeps the public `F` algorithm and is marked open.

| Case | Public line | Stored line | Caption |
|---|---|---|---|
| 3 | `F' U' F` | `F' U' F` | Front insert, open |
| 9 | `U' R U' R' U F' U' F` | `U' R U' R' U F' U' F` | Front insert, open |
| 24 | `F U R U' R' F' R U' R'` | `F U R U' R' F' R U' R'` | Sledgehammer, open |

**Setup.** 12, 23. Both store an `R2` line for a pair that is still out of the slot.

**Extract.** 25 through 41. Corner in the slot, edge in the slot, or both.

| Case | Stored line | Caption |
|---|---|---|
| 37 | `R' U R r U2 R2 U' R2 U' r'` | R2 extract. Replaces `R2 U2 F R2 F' U2 R' U R'` |
| 38 | `R2 U2 R' U' R U' R' U2 R'` | R2 extract |
| 39 | `R U2 R U R' U R U2 R2` | R2 extract |
| 40 | `r U' r' U2 r U r' R U R'` | Wide extract |
| 41 | `R U' R' r U' r' U2 r U r'` | Wide extract |

25 and 31 and 35 store a wide extract (`M` or `l`) and stay in Extract. 26 through 30 and 32 through 34 store the `U`/`R` or `U`/`L` pull-out. Their caption is Extract. An `R2` line replaces that pull-out when it is within two turns of the shortest legal line.

`l U L' U' M'` is the stored line for case 2, the sledge picture, on the back-left. `r' U' R U M'` stays in the trigger list. It is a slot row only when that sequence solves the same pair.

Case 36's shortest public line inside the voted set uses wide `u`. Wide `u` is rejected. The generator keeps searching the rest of that case's public list for a legal line. Until one exists, 36 stays in Extract, stored with the public standard and `open: true`, so the 41 are complete and the card shows the gap.

## Algorithm rule

The stored alphabet is `U R L r l M` and the suffixes `'` and `2`.

Rejected: `F B f b D d E S`, wide `u`, and `x y z`. A public `y` is written out by turning the slot, and the stored moves are what remains when they stay in the alphabet.

Rank the legal lines for the front-right picture:

1. Shortest.
2. In Extract, an `R2` or `L2` line within two turns of the shortest replaces it.
3. In Wide, a tie goes to the line that contains `r' U' R U M'` or its `l` mirror.
4. SpeedCubeDB vote order breaks whatever remains.

There is no length cap that drops a case. Basic's 8-turn boundary is only the filing rule that sends a longer pure `U`/`R` line to Setup. Every case is stored.

The other slot rows are legal lines whose pair picture matches, checked on the cube. A row that still needs `F` or `B` is absent. The default row is the slot that line solves. Front-right stays the default when a legal front-right line exists.

## Out of this cut

Color-agnostic cross, xcross, and double xcross wait. The grip switch and the slot picture are the pieces those would reuse.

Also out: a full scramble with the other three pairs still in, a 164-cell grid, cube rotations left inside the stored algorithm, `F` and `B` as the stored answer, a timer, a score, a second screen for picking skills.

## Engineering

F2L is a third `SetId`. The OLL and PLL machines stay. F2L does not go through the last-layer path.

### What is reused

- One window, pattern then case then alg card, Soft and Hard, Faces, the three-choice quiz, green then advance, red then wait.
- `cubing`, and the same `z2` home grip the last layer already uses: yellow up, white down, green front, orange right.
- The twenty-four grips in `colorSchemes`. Faces remaps a finished picture.
- `caseSetup`: the drawn case is the inverse of the stored algorithm.
- `closeness` for the two wrong quiz rows. The pool is the quiz's skill, or the marked skills when Quiz is pressed from the five-cell grid.
- Setup prefs, keyed `f2l:<id>`, in the same `quell-setup` blob. The value is the slot row that is on.

### What does not transfer

A `U` turn changes which F2L case is on the cube. `setups.ts` must not prepend `U`, `U'`, or `U2` to an F2L algorithm.

A left-right mirror solves the opposite slot. That slot is a row on this card when the rewritten line is legal.

`caseArrangements` shuffles side colors inside one OLL. F2L colors are the case. That search does not run.

`lastLayer` reads the U face and the U-layer ring. F2L paints the pair onto that same face. Stickers below that ring are not given a new box.

### Data

`src/data/f2l.ts` exports all 41. Each record:

- `id` — SpeedCubeDB number, `"1"` through `"41"`.
- `name` — the BirdF2L code for that picture.
- `group` — the public group name, kept for the checker.
- `skill` — `"basic" | "wide" | "front" | "extract" | "splitter"`. Setup on the grid is `splitter` in the file.
- `caption` — the technique name.
- `reach` — the public trigger, present when that trigger uses `F` or `B`.
- `algs` — the ranked legal lines. `algs[0]` is front-right and is the default.
- `open` — true only when no legal line exists yet.

`src/patterns.ts` holds the five skills and the case ids. The home grid reads that list. It does not read the SpeedCubeDB group names.

### Skill rule

Apply in order. First hit wins.

1. The target corner or the target edge is in the slot in the front-right picture → `extract`.
2. The stored line uses `r`, `l`, or `M` → `wide`.
3. The stored line uses `R2` or `L2`, and both pieces are out of the slot → `splitter`.
4. The public standard uses `F` or `f`, and the stored line is `U`/`R`/`L` only → `front`.
5. The stored line is `U`/`R` or `U`/`L` only, at most 8 turns → `basic`.
6. Anything left → `splitter`.

### Quiz mix

`quell-f2l-mix` in localStorage is the set of skill ids. Missing key means `wide`, `front`, `extract`, `splitter`.

Inside a skill, `casesFor` the quiz is that skill's cases. On the home grid, it is the union of the stored mix. An empty mix quizzes all five. Distractors come from that same pool. The face is the saved slot row.

### The picture

OLL stays yellow-against-empty. PLL stays arrows. F2L is one locked still per case, from `caseSetup(moves)`, in the home grip. The still does not rotate under the pointer. Hover does not reveal a face. A floor mirror does not stand in for one. The quiz picture has to be readable before the tap, and a cell in the grid has no hover on a phone.

The camera is about 29° above the horizon and about 32° to the side, so the front and the top are about the same size and the front is a little larger. The side is a readable grid. Left and right are that yaw, flipped. The case chooses it. It is not a control. The bottom face is not drawn, including the cross.

A pair sticker on a hidden face sits on that face, shifted straight out from the cube, behind it. Perspective lets the part that clears the silhouette show. That is the top layer of the back, and the layer on the side the camera is tilted toward. Nothing there is transparent. The corner that is on the bottom and on the side the camera is not tilted toward never clears that silhouette. Its colors are an arrow, and only then.

The measured still is `docs/forge/f2l-still.md`.

Extract holds 17 cases. The fit table grows one step past the current 4×4, to six columns and three rows, so those 17 stay on one screen. The five skills use the fit the grid already has.

### Checker

`verifyCases` grows an F2L pass. For every case:

- The record is one of the 41, once.
- A legal stored line has no rejected move. An `open` case is the only record allowed to keep a rejected move, and it is named in the check output.
- Inverse, then the algorithm, returns the solved cube.
- Centers stay. The cross stays solved in the picture and after the algorithm. The other three slots stay solved in the picture and after the algorithm.
- The unsolved pieces are that corner and that edge.
- The diagram matches `data/lock.ts`.
- `skill` is the skill rule's result, and the five lists cover the 41 once.
- `algs[0]` is the ranked front-right winner.
- Each later row solves its own slot and stays legal.

`checkTaxonomy` in `main.ts` learns the third set.

### Triggers

`triggers.ts` gains the families the captions name, longest match first:

- `r' U' R U M'` and `r U R' U' M`, plus the `l` mirrors.
- `F R' F' R`, `R' F R F'`, `F' U' F`, `F U F'`, so a public sledge still scores as a sledge when a reach is compared.
- `R U R'`, `R U' R'`, `R' U R`, `R' U' R`, plus the `L` mirrors.
- `R2 U2 R2`, `R2 U R2`, `R2 U' R2`, plus the `L2` mirrors.

### Files

- `src/types.ts` — `SetId` includes `"f2l"`. `CaseDef` gains `skill`, `caption`, `reach`, and `open`.
- `src/data/f2l.ts` — the 41.
- `src/patterns.ts` — Basic, Wide, Front, Extract, Setup.
- `src/slot.ts` — `slotView`.
- `src/face.ts` — pair stickers on the existing sided face.
- `src/setups.ts` — F2L ranking and slot rows. The `U`-start loop stays on OLL and PLL.
- `src/truth.ts`, `src/data/lock.ts` — the checker and the locks.
- `src/triggers.ts` — the families above.
- `src/main.ts` — the third set, the mark, captions, quiz pool.
- `index.html` — the F2L button.

`style.css` for the slot picture waits on Atelier.

### Boot

The checker applies each stored line and its slot rows. The OLL arrangement search stays the slow part of boot. F2L does not run it.
