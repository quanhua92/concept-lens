import { mulberry32, randnVec, quantizeSym, type QuantResult } from '@/lib/math'

export function makeWeights(seed: number, n: number, outlierMag: number, outlierIdx: number[] = [3]): number[] {
  const v = randnVec(mulberry32(seed), n, 0.25)
  for (const i of outlierIdx) v[i] = outlierMag
  return v
}

export interface GroupResult {
  deq: number[]
  rmse: number
}

export function quantizeGrouped(v: number[], bits: number, groupSize: number): GroupResult {
  const deq: number[] = []
  for (let g = 0; g < v.length; g += groupSize) {
    const chunk = v.slice(g, g + groupSize)
    const r: QuantResult = quantizeSym(chunk, bits)
    deq.push(...r.deq)
  }
  const rmse = Math.sqrt(v.reduce((s, x, i) => s + (x - deq[i]) ** 2, 0) / v.length)
  return { deq, rmse }
}

export function quantizeTensor(v: number[], bits: number): GroupResult {
  const r = quantizeSym(v, bits)
  return { deq: r.deq, rmse: r.rmse }
}

export const QWEN_SERVE = {
  params: 7.62e9,
  kvBytesPerToken: 2 * 28 * 4 * 128 * 2,
  bandwidthGbs: 1008,
  gpuBytes: 24 * 1024 ** 3,
}

export interface ServeConfig {
  name: string
  weightBytes: number
  kvBytes: number
  color: string
  note: string
}

export function serveConfigs(contextLength: number, batch: number): ServeConfig[] {
  const P = QWEN_SERVE.params
  const kvFull = QWEN_SERVE.kvBytesPerToken * contextLength * batch
  return [
    { name: 'FP16', weightBytes: P * 2, kvBytes: kvFull, color: '#fb7185', note: 'baseline — 15.2 GB weights' },
    { name: 'W8A16', weightBytes: P * 1, kvBytes: kvFull, color: '#f59e0b', note: '8-bit weights, FP16 compute' },
    { name: 'W4A16', weightBytes: P * 0.5, kvBytes: kvFull, color: '#22d3ee', note: '4-bit weights (AWQ/GPTQ-class)' },
    { name: 'W4A16 + KV 8-bit', weightBytes: P * 0.5, kvBytes: (QWEN_SERVE.kvBytesPerToken / 2) * contextLength * batch, color: '#34d399', note: 'cache quantized too' },
  ]
}

export function tokPerSec(weightBytes: number, kvBytes: number): number {
  return (QWEN_SERVE.bandwidthGbs * 1e9) / (weightBytes + kvBytes)
}

export { randnVec, mulberry32, quantizeSym }
export type { QuantResult }
