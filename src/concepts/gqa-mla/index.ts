import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const gqaMla: ConceptMeta = {
  slug: 'gqa-mla',
  title: 'GQA & MLA',
  tagline: 'Sharing heads vs compressing them — the modern KV cache diets',
  difficulty: 'intermediate',
  track: 'architecture',
  stage: 5,
  chapters: [
    { id: 'gqa', title: 'Share the heads (GQA)', Component: lazy(() => import('./chapters/GqaChapter')) },
    { id: 'mla', title: 'Cache the latent (MLA)', Component: lazy(() => import('./chapters/MlaChapter')) },
    { id: 'compare', title: 'The whole family', Component: lazy(() => import('./chapters/ComparisonChapter')) },
  ],
}
