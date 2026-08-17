import type { ConceptMeta } from './registry'
import { residualAttention } from './residual-attention'
import { tokenPipeline } from './token-pipeline'
import { selfAttention } from './self-attention'
import { multiHead } from './multi-head-attention'
import { kvCache } from './kv-cache'
import { gqaMla } from './gqa-mla'
import { moe } from './moe'
import { fp8Mtp } from './fp8-mtp'

export const concepts: ConceptMeta[] = [tokenPipeline, selfAttention, multiHead, kvCache, gqaMla, moe, fp8Mtp, residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
