import { mulberry32, randn, randnMat, matmul, type Mat } from '@/lib/math'

export const V3_DIMS = {
  layers: 61,
  heads: 128,
  headDim: 128,
  dModel: 7168,
  dLatent: 512,
  dRope: 64,
}

export interface KVVariant {
  name: string
  kvElementsPerTokenPerLayer: number
  color: string
  note: string
}

export function mhaKV(heads: number, headDim: number): number {
  return 2 * heads * headDim
}

export function gqaKV(kvHeads: number, headDim: number): number {
  return 2 * kvHeads * headDim
}

export function mlaKV(dLatent: number, dRope: number): number {
  return dLatent + dRope
}

export function v3Variants(): KVVariant[] {
  const { heads, headDim, dLatent, dRope } = V3_DIMS
  return [
    { name: 'MHA (128 kv-heads)', kvElementsPerTokenPerLayer: mhaKV(heads, headDim), color: '#fb7185', note: '2 × 128 × 128 = 32,768' },
    { name: 'GQA (8 kv-heads)', kvElementsPerTokenPerLayer: gqaKV(8, headDim), color: '#f59e0b', note: '2 × 8 × 128 = 2,048' },
    { name: 'MLA (DeepSeek-V3)', kvElementsPerTokenPerLayer: mlaKV(dLatent, dRope), color: '#22d3ee', note: '512 latent + 64 RoPE = 576' },
    { name: 'MQA (1 kv-head)', kvElementsPerTokenPerLayer: gqaKV(1, headDim), color: '#a1a1aa', note: '2 × 1 × 128 = 256' },
  ]
}

export function bytesFor(elements: number, bytesPerElement = 2): number {
  return elements * V3_DIMS.layers * bytesPerElement
}

export function qToKvGroup(nQueryHeads: number, nKvHeads: number): number[][] {
  const groupSize = Math.ceil(nQueryHeads / nKvHeads)
  const groups: number[][] = []
  for (let g = 0; g < nKvHeads; g++) {
    const heads: number[] = []
    for (let q = g * groupSize; q < Math.min((g + 1) * groupSize, nQueryHeads); q++) heads.push(q)
    if (heads.length > 0) groups.push(heads)
  }
  return groups
}

export interface BottleneckResult {
  ranks: number[]
  relError: number[]
}

export function bottleneckExperiment(d: number, maxRank: number, seed: number, samples = 200): BottleneckResult {
  const rng = mulberry32(seed)
  const X: Mat = randnMat(rng, samples, d, 1)
  const ranks: number[] = []
  const relError: number[] = []
  for (let r = 1; r <= maxRank; r++) {
    const W = randnMat(mulberry32(seed * 100 + r), r, d, 1 / Math.sqrt(d))
    const proj = matmul(X, transposeSafe(W))
    const recon = matmul(proj, W)
    const nx = Math.sqrt(X.flat().reduce((s, v) => s + v * v, 0))
    const nd = Math.sqrt(X.flat().reduce((s, v, i) => s + (v - recon.flat()[i]) ** 2, 0))
    ranks.push(r)
    relError.push(nd / Math.max(nx, 1e-9))
  }
  return { ranks, relError }
}

function transposeSafe(m: Mat): Mat {
  return m[0].map((_, j) => m.map((row) => row[j]))
}

export function sampleLatentFlow(seed: number): { x: number[]; latent: number[]; rope: number[] } {
  const rng = mulberry32(seed)
  const x = Array.from({ length: 16 }, () => randn(rng))
  const down = randnMat(mulberry32(seed + 1), 4, 16, 0.25)
  const latent = down.map((row) => row.reduce((s, w, i) => s + w * x[i], 0))
  const rope = Array.from({ length: 2 }, (_, i) => x[i * 3] * 0.5)
  return { x, latent, rope }
}
