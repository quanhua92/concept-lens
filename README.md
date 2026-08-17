# concept-lens

Interactive, math-honest visual explanations of the ideas behind modern machine learning.
Every number on the site is computed live in the browser — never faked or hardcoded.

Built around an 18-stage LLM engineering curriculum (architecture → compression → serving → alignment).

## Concepts

### Architecture
| Stage | Concept | Highlights |
|---|---|---|
| 1 | [Token Pipeline](/c/token-pipeline) | real BPE trainer + GPT-2 regex pre-tokenizer, forward pass, sampling |
| 2 | [Self-Attention](/c/self-attention) | similarity, live √dₖ variance experiment, causal mask |
| 3 | [Multi-Head Attention](/c/multi-head-attention) | head committee, shape shuffle, params invariant to H |
| 4 | [KV Cache](/c/kv-cache) | quadratic-to-linear FLOPs, prefill vs decode, the memory bill |
| 5 | [GQA & MLA](/c/gqa-mla) | head sharing, latent compression (DeepSeek-V3 numbers), family comparison |
| 6 | [Mixture of Experts](/c/moe) | sigmoid top-K routing, live aux-loss balancing, fine-grained + shared |
| 7 | [FP8 & MTP](/c/fp8-mtp) | live bit encoders, per-tensor scaling, speculative heads |
| — | [Attention Residual](/c/residual-attention) | the residual stream: why blocks add instead of replace |

### Compression
| Stage | Concept | Highlights |
|---|---|---|
| 9 | [Structural Pruning](/c/pruning) | GQA-aware param census, live trained network pruned by Taylor/magnitude/random |
| 10 | [Distillation](/c/distillation) | dark knowledge, forward vs reverse KL, live KD recovery |
| 11 | [LoRA](/c/lora) | in-browser SVD rank experiment, adapter anatomy, merge & serve |

### Serving
| Stage | Concept | Highlights |
|---|---|---|
| 12 | [Roofline](/c/roofline) | interactive roofline (A100/H100/4090), the tok/s division |
| 13 | [Continuous Batching](/c/continuous-batching) | discrete-event scheduler sim, static vs iteration-level |
| 14 | [PagedAttention](/c/paged-attention) | block accounting, reserve vs paginate |
| 15 | [Speculative Decoding](/c/speculative-decoding) | exact accept/reject loop, verified output-invariance theorem |
| 16 | [Quantized Serving](/c/quantization) | grid geometry, outliers & groups, the bandwidth dividend |

### Alignment
| Stage | Concept | Highlights |
|---|---|---|
| 17 | [DPO & GRPO](/c/dpo-grpo) | the preference loss landscape, live group-relative RL |

(Stage 8 — profiling — is folded into the pruning census; stage 18 is the capstone engine.)

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) (via `@tailwindcss/vite`, tokens in `src/index.css`)
- [Framer Motion](https://motion.dev) for animation
- [React Router](https://reactrouter.com) for routing
- Package manager: **pnpm**. No other runtime deps — all math (attention, SVD, FP8 bit encoders, trainers, schedulers) is hand-written in `src/lib/`.

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
    registry.ts              # ConceptMeta/Track types, difficulty & track colors
    <slug>/                  # one folder per concept
      index.ts               # metadata + lazy chapter imports
      lib.ts / recovery.ts   # concept-local math (often the interesting part)
      chapters/              # chapter components (lazy, code-split)
      SOURCES.md             # primary sources + honesty notes
  components/
    ui/                      # Slider, Toggle, SegmentedControl, Callout, Formula, Button, ChapterNav
    viz/                     # HeatmapGrid, BarVector, LineChart, DistBars, BitRow, MemoryBar
    layout/                  # Layout, Header, ConceptCard
  lib/                       # math.ts, train.ts, simulate.ts, anim.ts, format.ts, utils.ts
  pages/                     # Home, ConceptPage
  hooks/                     # useActiveSection (scroll spy)
```

## Adding a new concept

1. Create `src/concepts/<your-slug>/` with an `index.ts` exporting a `ConceptMeta`
   (see any existing concept):
   ```ts
   import { lazy } from 'react'
   import type { ConceptMeta } from '@/concepts/registry'

   export const myConcept: ConceptMeta = {
     slug: 'my-concept',
     title: 'My Concept',
     tagline: 'One sentence about the intuition it builds',
     difficulty: 'beginner' | 'intermediate' | 'advanced',
     track: 'architecture' | 'compression' | 'serving' | 'alignment',
     stage: 3, // optional curriculum stage badge
     chapters: [
       { id: 'intro', title: 'Intro', Component: lazy(() => import('./chapters/IntroChapter')) },
     ],
   }
   ```
2. Add chapter components under `chapters/` (default exports).
3. Put the math in a concept-local `lib.ts` — every rendered number must be computed,
   never hardcoded. Verify it with `node --experimental-strip-types` against hand-computed
   values (see AGENTS.md).
4. Record primary sources + honesty notes in `SOURCES.md`.
5. Register it in `src/concepts/index.ts`.

Routing, the home page card (grouped by track), and chapter nav are generated from the registry.
