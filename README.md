# concept-lens

Interactive, math-honest visual explanations of the ideas behind modern machine learning.
Every number on the site is computed live in the browser — nothing is faked or hardcoded.

**Current concept:** [Attention Residual](/c/residual-attention) — why every transformer
block *adds* to the residual stream instead of replacing it.

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) (via `@tailwindcss/vite`, tokens in `src/index.css`)
- [Framer Motion](https://motion.dev) for animation
- [React Router](https://reactrouter.com) for routing
- Package manager: **pnpm**

## Commands

```bash
pnpm install        # install deps
pnpm dev            # dev server
pnpm build          # typecheck + production build
pnpm typecheck      # tsc only
pnpm lint           # oxlint
pnpm preview        # serve the production build
```

## Project structure

```
src/
  concepts/
    index.ts                 # concept list + getConcept()
    registry.ts              # ConceptMeta / ConceptChapter types, difficulty colors
    residual-attention/      # one folder per concept
      index.ts               # concept metadata + lazy chapter imports
      chapters/              # chapter components (lazy-loaded, code-split)
  components/
    ui/                      # Slider, Toggle, SegmentedControl, Callout, Formula, Button, ChapterNav
    viz/                     # HeatmapGrid, BarVector, LineChart (SVG, responsive)
    layout/                  # Layout, Header, ConceptCard
  pages/                     # Home, ConceptPage
  hooks/                     # useActiveSection (scroll spy)
  lib/                       # math.ts, simulate.ts, anim.ts, utils.ts
```

## Adding a new concept

1. Create `src/concepts/<your-slug>/` with an `index.ts` exporting a `ConceptMeta`
   (see `src/concepts/residual-attention/index.ts`):
   ```ts
   import { lazy } from 'react'
   import type { ConceptMeta } from '@/concepts/registry'

   export const myConcept: ConceptMeta = {
     slug: 'my-concept',
     title: 'My Concept',
     tagline: 'One sentence about the intuition it builds',
     difficulty: 'beginner' | 'intermediate' | 'advanced',
     chapters: [
       { id: 'intro', title: 'Intro', Component: lazy(() => import('./chapters/IntroChapter')) },
     ],
   }
   ```
2. Add chapter components under `src/concepts/<your-slug>/chapters/` (default exports).
3. Register it in `src/concepts/index.ts`.
4. All math/data shown must be computed in `src/lib/` (or a concept-local lib) — never
   hardcoded arrays of "results".

That's it — routing, the home page card, and chapter navigation are generated from the registry.
