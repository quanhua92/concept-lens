import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const dpoGrpo: ConceptMeta = {
  slug: 'dpo-grpo',
  title: 'DPO & GRPO',
  tagline: 'Preferences as classification, and the group as its own critic',
  difficulty: 'advanced',
  track: 'alignment',
  stage: 17,
  chapters: [
    { id: 'dpo', title: 'DPO: the preference loss', Component: lazy(() => import('./chapters/DpoChapter')) },
    { id: 'grpo', title: 'GRPO: the group critic', Component: lazy(() => import('./chapters/GrpoChapter')) },
  ],
}
