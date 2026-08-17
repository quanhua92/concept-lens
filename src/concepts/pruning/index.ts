import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const pruning: ConceptMeta = {
  slug: 'pruning',
  title: 'Structural Pruning',
  tagline: 'Delete first, ask questions later — finding the parameters a model never needed',
  difficulty: 'intermediate',
  track: 'compression',
  stage: 9,
  chapters: [
    { id: 'census', title: 'Where parameters live', Component: lazy(() => import('./chapters/CensusChapter')) },
    { id: 'live-prune', title: 'Prune a real trained network', Component: lazy(() => import('./chapters/LivePruneChapter')) },
  ],
}
