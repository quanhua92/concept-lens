import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const lora: ConceptMeta = {
  slug: 'lora',
  title: 'LoRA',
  tagline: 'Fine-tune a 7B model by training 0.5% of it — then merge for free',
  difficulty: 'intermediate',
  track: 'compression',
  stage: 11,
  chapters: [
    { id: 'low-rank', title: 'The low-rank bet', Component: lazy(() => import('./chapters/LowRankChapter')) },
    { id: 'adapter', title: 'Anatomy of the adapter', Component: lazy(() => import('./chapters/AdapterChapter')) },
    { id: 'merge', title: 'Merge & serve', Component: lazy(() => import('./chapters/MergeChapter')) },
  ],
}
