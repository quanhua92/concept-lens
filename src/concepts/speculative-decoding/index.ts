import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const speculativeDecoding: ConceptMeta = {
  slug: 'speculative-decoding',
  title: 'Speculative Decoding',
  tagline: 'Draft fast, verify once — exact target quality at 2–3× the speed',
  difficulty: 'advanced',
  track: 'serving',
  stage: 15,
  chapters: [
    { id: 'accept', title: 'The exact test', Component: lazy(() => import('./chapters/AcceptChapter')) },
    { id: 'speedup', title: 'The speedup arithmetic', Component: lazy(() => import('./chapters/SpeedupChapter')) },
  ],
}
