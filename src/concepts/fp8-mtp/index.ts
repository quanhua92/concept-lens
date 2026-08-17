import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const fp8Mtp: ConceptMeta = {
  slug: 'fp8-mtp',
  title: 'FP8 & Multi-Token Prediction',
  tagline: 'Training on 8-bit floats, and heads that see several tokens ahead',
  difficulty: 'advanced',
  track: 'architecture',
  stage: 7,
  chapters: [
    { id: 'bits', title: 'The bit budget', Component: lazy(() => import('./chapters/BitsChapter')) },
    { id: 'scaling', title: 'Scaling to fit ±448', Component: lazy(() => import('./chapters/ScalingChapter')) },
    { id: 'mtp', title: 'Predicting ahead', Component: lazy(() => import('./chapters/MtpChapter')) },
  ],
}
