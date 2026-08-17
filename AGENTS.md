# AGENTS.md

Guide for AI agents working on **concept-lens** — an interactive site that teaches ML
concepts through honest, computed-in-browser visualizations.

## Non-negotiables

1. **Math honesty.** Every number rendered on screen comes from real computation in
   `src/lib/` (or a concept-local module) — seeded PRNG (`mulberry32`), real softmax /
   layernorm / matmul, real simulations. Never hardcode arrays of "results" or fake data.
   Toy models are fine and encouraged, but label them as toy models in the copy.
2. **Determinism.** Use seeded randomness (`src/lib/math.ts`). Same seed → same picture.
   This keeps screenshots stable and claims reproducible.
3. **Accessibility.** Mobile-first (usable at 375px). Interactive controls must be
   touch-friendly (≥44px hit areas). Respect `prefers-reduced-motion`:
   `useReducedMotion()` from framer-motion for autoplay loops, CSS handles the rest.
   Interactive elements need focus-visible styles and aria labels.
4. **Dark theme only** (for now). Use the semantic tokens below, not ad-hoc colors.

## Commands

```bash
pnpm dev        # dev server
pnpm typecheck  # tsc -b (strict; noUnusedLocals/Parameters enforced)
pnpm lint       # oxlint
pnpm build      # typecheck + production build
```

Before declaring any task done: `pnpm typecheck`, `pnpm lint`, and `pnpm build` must pass.
Spot-check new math with `node --experimental-strip-types` against hand-computed values
(copy the lib file to a temp dir and fix import extensions to `.ts` — Node ESM requires
explicit extensions).

## Architecture

- **Registry pattern** (`src/concepts/`): each concept is a self-contained folder with
  `index.ts` exporting `ConceptMeta` (slug, title, tagline, difficulty, chapters with
  `lazy()` components). Register in `src/concepts/index.ts`. Routing (`/c/:slug`), the
  home page card, and chapter nav are all generated from the registry.
- **Chapters** are default-exported components under `chapters/`, one per `<section>` on
  the concept page. They are lazy-loaded → automatically code-split.
- **Shared primitives**: `src/components/ui/` (Slider, Toggle, SegmentedControl, Callout,
  Formula, Button, ChapterNav) and `src/components/viz/` (HeatmapGrid, BarVector,
  LineChart). Prefer extending these over inventing new one-off widgets inside chapters.
- **Path alias**: `@/` → `src/`.

### Design tokens (Tailwind v4 `@theme` in `src/index.css`)

| Token | Meaning |
|---|---|
| `ink` / `panel` / `panel-2` / `line` | background surface ladder, borders |
| `mute` / `dim` | primary / secondary text on dark |
| `accent` (cyan) | the stream, reads, identity path, "with residual" |
| `delta` (amber) | writes, attention edits, warnings-lite |
| `good` (emerald) | healthy outcome, residual on |
| `bad` (rose) | broken outcome, "without residual", negatives |

Color semantics are a contract across chapters — keep them consistent so comparisons
read instantly (cyan-vs-rose means with-vs-without).

### TypeScript notes

Strict + `verbatimModuleSyntax` (type-only imports need `import type`) +
`erasableSyntaxOnly` (no enums/namespaces — use `as const` objects) +
`noUnusedLocals/Parameters`. Framer Motion easing arrays must be typed tuples:
`const EASE: [number, number, number, number] = [...]` (see `src/lib/anim.ts`).

## Workflow: adding a new concept

### 1. Research

- Prefer primary, authoritative sources: the original paper, author blog posts,
  distill.pub, Anthropic/DeepMind explainers. **Web-search the primary source before
  writing any lib code** — do not write from memory and check later. Record sources
  in the concept's `SOURCES.md` (required).
- Extract: the precise mechanism, the standard misconception, the minimal math needed
  to show it honestly, and 1–2 "punchline" contrasts (with vs. without, before vs. after).
- Identify what can be *computed* small: pick dimensions (e.g. 3 tokens × d=8) where the
  real algorithm runs in-browser in microseconds. Never simulate by faking trends.
- Cited constants (model configs, GPU specs) must be verified against the source
  (config.json, vendor spec pages); everything else must be computed.

### 2. Draft

Write the chapter arc before any code. The proven template (see residual-attention):

1. **Orientation** — the mental model / metaphor, stated plainly.
2. **Mechanism, stepped** — one interactive walkthrough of the real computation,
   pausable, with numbers visible.
3. **Contrast** — a parameterized with/without experiment; user controls the knobs,
   a chart or readout makes the difference undeniable.
4. **Punchline** — the one-sentence takeaway + an honesty note about what was
   simplified and what the real full-scale version does differently.

Rules of thumb: 2–4 chapters per concept; each chapter = one idea + one interaction;
copy is concise, concrete, second person ("watch", "try"); every simplification is
admitted in a `Callout variant="note"`.

### 3. Plan

- Define the folder: `src/concepts/<slug>/index.ts` + `chapters/` + concept-local
  components/ if the diagrams are specific to it.
- Decide which shared primitives cover the visuals; list any new primitive needed and
  whether it belongs in `ui/` or `viz/` (reusable) vs concept-local (one-off).
- Decide knobs (sliders) and what each *teaches* — no knob without a lesson.

### 4. Build

- Register the concept, write chapters as lazy default exports.
- Compute first, render second: get the lib function + its spot-check working before
  touching JSX. If the demo needs a trained model, train it live in-browser (seeded) —
  see `src/lib/train.ts` and the pruning/distillation/GRPO concepts for patterns.
- Hyperparameters for in-browser training loops are part of the honesty contract: tune
  them in node spot-checks until the demo shows the real behavior (e.g. KD > hard-label
  recovery), and never ship a demo whose dynamics were never verified.
- Reuse `Formula`, `Callout`, `Slider`, `Toggle`, `SegmentedControl`, `Button` for all
  controls and copy blocks. Charts go through `LineChart`/`HeatmapGrid`/`BarVector`/
  `DistBars`/`BitRow`/`MemoryBar`. Concept-local SVG charts are fine when one-off
  (see the roofline chart).
- No comments in code unless genuinely necessary. No new dependencies without asking.

### 5. Verify

- `pnpm typecheck && pnpm lint && pnpm build`.
- Hand-verify the math (softmax rows sum to 1, matmul against a worked example,
  simulation endpoints match closed-form intuition like √L vs g^L).
- Check 375px viewport: no horizontal overflow, controls reachable, charts legible.
- Check `prefers-reduced-motion`: autoplay pauses, stepping still works.

## Git

- Conventional commits with specific descriptions ("feat: add softmax-temperature
  chapter to attention-residual"), never vague ("update code").
- Never push without explicit request. Never commit `.env` files.
