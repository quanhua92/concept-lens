import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const pagedAttention: ConceptMeta = {
  slug: 'paged-attention',
  title: 'PagedAttention',
  tagline: 'Virtual memory for the KV cache — blocks, tables, and near-zero waste',
  difficulty: 'intermediate',
  track: 'serving',
  stage: 14,
  chapters: [
    { id: 'paging', title: 'Reserve vs paginate', Component: lazy(() => import('./chapters/PagingChapter')) },
  ],
}
