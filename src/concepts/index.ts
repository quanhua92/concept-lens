import type { ConceptMeta } from './registry'
import { residualAttention } from './residual-attention'
import { tokenPipeline } from './token-pipeline'
import { selfAttention } from './self-attention'
import { multiHead } from './multi-head-attention'
import { kvCache } from './kv-cache'
import { gqaMla } from './gqa-mla'
import { moe } from './moe'
import { fp8Mtp } from './fp8-mtp'
import { pruning } from './pruning'
import { distillation } from './distillation'
import { lora } from './lora'
import { roofline } from './roofline'

export const concepts: ConceptMeta[] = [tokenPipeline, selfAttention, multiHead, kvCache, gqaMla, moe, fp8Mtp, pruning, distillation, lora, roofline, residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
