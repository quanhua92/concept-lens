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
import { continuousBatching } from './continuous-batching'
import { pagedAttention } from './paged-attention'
import { speculativeDecoding } from './speculative-decoding'

export const concepts: ConceptMeta[] = [tokenPipeline, selfAttention, multiHead, kvCache, gqaMla, moe, fp8Mtp, pruning, distillation, lora, roofline, continuousBatching, pagedAttention, speculativeDecoding, residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
