import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const residualAttention: ConceptMeta = {
  slug: 'residual-attention',
  title: 'Attention Residual',
  tagline: 'Why every transformer block adds to the stream instead of replacing it',
  difficulty: 'intermediate',
  track: 'architecture',
  chapters: [
    {
      id: 'stream',
      title: 'The residual stream',
      Component: lazy(() => import('./chapters/StreamChapter')),
    },
    {
      id: 'add',
      title: 'Anatomy of Add',
      Component: lazy(() => import('./chapters/AddChapter')),
    },
    {
      id: 'with-without',
      title: 'With vs. without',
      Component: lazy(() => import('./chapters/WithWithoutChapter')),
    },
    {
      id: 'gradients',
      title: 'Why gradients love it',
      Component: lazy(() => import('./chapters/GradientChapter')),
    },
  ],
}
