import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const kvCache: ConceptMeta = {
  slug: 'kv-cache',
  title: 'KV Cache',
  tagline: 'The trick that makes decoding linear — and the memory bill it sends you',
  difficulty: 'beginner',
  track: 'architecture',
  stage: 4,
  chapters: [
    { id: 'redundancy', title: 'The redundant recompute', Component: lazy(() => import('./chapters/RedundancyChapter')) },
    { id: 'prefill-decode', title: 'Prefill vs decode', Component: lazy(() => import('./chapters/PrefillDecodeChapter')) },
    { id: 'memory-bill', title: 'The memory bill', Component: lazy(() => import('./chapters/MemoryBillChapter')) },
  ],
}
