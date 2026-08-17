import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const multiHead: ConceptMeta = {
  slug: 'multi-head-attention',
  title: 'Multi-Head Attention',
  tagline: 'Parallel viewpoints on one stream — without paying extra parameters',
  difficulty: 'beginner',
  track: 'architecture',
  stage: 3,
  chapters: [
    { id: 'viewpoints', title: 'A committee of heads', Component: lazy(() => import('./chapters/ViewpointsChapter')) },
    { id: 'shapes', title: 'The shape shuffle', Component: lazy(() => import('./chapters/ShapeChapter')) },
  ],
}
