import type { ConceptMeta } from './registry'
import { residualAttention } from './residual-attention'

export const concepts: ConceptMeta[] = [residualAttention]

export function getConcept(slug: string): ConceptMeta | undefined {
  return concepts.find((c) => c.slug === slug)
}
