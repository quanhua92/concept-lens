export interface ModelKVSpec {
  name: string
  layers: number
  kvHeads: number
  headDim: number
  bytesPerElement: number
}

export const QWEN7B: ModelKVSpec = {
  name: 'Qwen2.5-7B (GQA)',
  layers: 28,
  kvHeads: 4,
  headDim: 128,
  bytesPerElement: 2,
}

export const QWEN7B_MHA: ModelKVSpec = {
  name: 'Qwen2.5-7B if MHA',
  layers: 28,
  kvHeads: 28,
  headDim: 128,
  bytesPerElement: 2,
}

export function kvBytesPerToken(spec: ModelKVSpec): number {
  return 2 * spec.layers * spec.kvHeads * spec.headDim * spec.bytesPerElement
}

export function kvTotalBytes(spec: ModelKVSpec, contextLength: number, batchSize = 1): number {
  return kvBytesPerToken(spec) * contextLength * batchSize
}

export function tokensToGB(bytes: number): number {
  return bytes / 1024 ** 3
}

export interface DecodeStepAccounting {
  step: number
  prefixTokens: number
  flopsNoCache: number
  flopsCached: number
}

export function decodeFlops(dModel: number, layers: number, prefixTokens: number, cached: boolean): number {
  const projectionsOneToken = 2 * dModel * dModel * layers
  const attentionVsPrefix = 2 * dModel * (prefixTokens + 1) * layers
  if (cached) return projectionsOneToken + attentionVsPrefix
  return projectionsOneToken * (prefixTokens + 1) + attentionVsPrefix
}

export function cumulativeFlops(dModel: number, layers: number, steps: number, cached: boolean): number[] {
  const out: number[] = []
  let total = 0
  for (let t = 1; t <= steps; t++) {
    total += decodeFlops(dModel, layers, t - 1, cached)
    out.push(total)
  }
  return out
}

export interface DecodeWeightsBytes {
  weightBytes: number
  kvBytes: number
}

export function decodeTraffic(params: number, bytesPerElement: number, spec: ModelKVSpec, contextLength: number): DecodeWeightsBytes {
  return {
    weightBytes: params * bytesPerElement,
    kvBytes: kvTotalBytes(spec, contextLength),
  }
}

export const QWEN7B_PARAMS = 7.6e9
