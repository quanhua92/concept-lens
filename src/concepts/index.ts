import type { ConceptMeta } from './registry'
import { residualAttention } from './residual-attention'
import { tokenPipeline } from './token-pipeline'
import { selfAttention } from './self-attention'

export const concepts: ConceptMeta[] = [tokenPipeline, selfAttention, residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
