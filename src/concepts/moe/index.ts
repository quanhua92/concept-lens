import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const moe: ConceptMeta = {
  slug: 'moe',
  title: 'Mixture of Experts',
  tagline: '671B parameters, 37B at work — sparse routing and the balancing act it needs',
  difficulty: 'intermediate',
  track: 'architecture',
  stage: 6,
  chapters: [
    { id: 'routing', title: 'Route every token', Component: lazy(() => import('./chapters/RoutingChapter')) },
    { id: 'balance', title: 'The collapse problem', Component: lazy(() => import('./chapters/BalanceChapter')) },
    { id: 'design', title: 'Fine-grained + shared', Component: lazy(() => import('./chapters/DesignChapter')) },
  ],
}
