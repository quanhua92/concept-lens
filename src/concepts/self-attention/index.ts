import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const selfAttention: ConceptMeta = {
  slug: 'self-attention',
  title: 'Self-Attention',
  tagline: 'Similarity, the 1/√dₖ scale, and the causal mask — the full scoring story',
  difficulty: 'beginner',
  track: 'architecture',
  stage: 2,
  chapters: [
    { id: 'similarity', title: 'Tokens compare themselves', Component: lazy(() => import('./chapters/SimilarityChapter')) },
    { id: 'scale', title: 'Why divide by √dₖ', Component: lazy(() => import('./chapters/ScaleChapter')) },
    { id: 'mask', title: 'The causal mask', Component: lazy(() => import('./chapters/MaskChapter')) },
  ],
}
