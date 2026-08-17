import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const continuousBatching: ConceptMeta = {
  slug: 'continuous-batching',
  title: 'Continuous Batching',
  tagline: 'Scheduling at token granularity — why vLLM-class engines never run empty seats',
  difficulty: 'intermediate',
  track: 'serving',
  stage: 13,
  chapters: [
    { id: 'scheduler', title: 'Static vs iteration-level', Component: lazy(() => import('./chapters/BatchingChapter')) },
  ],
}
