import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const roofline: ConceptMeta = {
  slug: 'roofline',
  title: 'Roofline & Inference Physics',
  tagline: 'Why decode is memory-bound and what batching actually buys',
  difficulty: 'intermediate',
  track: 'serving',
  stage: 12,
  chapters: [
    { id: 'chart', title: 'Two ceilings', Component: lazy(() => import('./chapters/RooflineChapter')) },
    { id: 'tps', title: 'The tok/s division', Component: lazy(() => import('./chapters/TpsChapter')) },
  ],
}
