import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const quantization: ConceptMeta = {
  slug: 'quantization',
  title: 'Quantized Serving',
  tagline: 'Fewer bits, same bandwidth division — the tok/s dividend',
  difficulty: 'intermediate',
  track: 'serving',
  stage: 16,
  chapters: [
    { id: 'grid', title: 'The grid & outliers', Component: lazy(() => import('./chapters/GridChapter')) },
    { id: 'serving', title: 'The bandwidth dividend', Component: lazy(() => import('./chapters/ServingChapter')) },
  ],
}
