import { lazy } from 'react'
import type { ConceptMeta } from '@/concepts/registry'

export const tokenPipeline: ConceptMeta = {
  slug: 'token-pipeline',
  title: 'Token Pipeline',
  tagline: 'From raw text to a next-token bet: BPE, embeddings, logits, sampling',
  difficulty: 'beginner',
  track: 'architecture',
  stage: 1,
  chapters: [
    { id: 'bpe', title: 'Words to tokens', Component: lazy(() => import('./chapters/BpeChapter')) },
    { id: 'forward', title: 'One forward pass', Component: lazy(() => import('./chapters/ForwardChapter')) },
    { id: 'sampling', title: 'Choosing the next token', Component: lazy(() => import('./chapters/SamplingChapter')) },
  ],
}
