import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const distillation: ConceptMeta = {
  slug: 'distillation',
  title: 'Distillation',
  tagline: 'Soft targets, dark knowledge, and healing a pruned model',
  difficulty: 'intermediate',
  track: 'compression',
  stage: 10,
  chapters: [
    { id: 'soft-targets', title: 'Soft targets', Component: lazy(() => import('./chapters/SoftTargetsChapter')) },
    { id: 'kl', title: 'Forward vs reverse KL', Component: lazy(() => import('./chapters/KlChapter')) },
    { id: 'recovery', title: 'Recover the pruned model', Component: lazy(() => import('./chapters/RecoveryChapter')) },
  ],
}
