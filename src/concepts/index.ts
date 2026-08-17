import type { ConceptMeta } from './registry'
import { residualAttention } from './residual-attention'
import { tokenPipeline } from './token-pipeline'
import { selfAttention } from './self-attention'
import { multiHead } from './multi-head-attention'
import { kvCache } from './kv-cache'
import { gqaMla } from './gqa-mla'

export const concepts: ConceptMeta[] = [tokenPipeline, selfAttention, multiHead, kvCache, gqaMla, residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
