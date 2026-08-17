export type Vec = number[]
export type Mat = number[][]

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randn(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function randnVec(rng: () => number, n: number, scale = 1): Vec {
  return Array.from({ length: n }, () => randn(rng) * scale)
}

export function randnMat(rng: () => number, rows: number, cols: number, scale = 1): Mat {
  return Array.from({ length: rows }, () => randnVec(rng, cols, scale))
}

export function matmul(a: Mat, b: Mat): Mat {
  const n = a.length
  const m = b[0].length
  const k = b.length
  const out: Mat = Array.from({ length: n }, () => new Array<number>(m).fill(0))
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const aip = a[i][p]
      if (aip === 0) continue
      for (let j = 0; j < m; j++) {
        out[i][j] += aip * b[p][j]
      }
    }
  }
  return out
}

export function transpose(a: Mat): Mat {
  return a[0].map((_, j) => a.map((row) => row[j]))
}

export function softmax(v: Vec, temperature = 1): Vec {
  const scaled = v.map((x) => x / temperature)
  const max = Math.max(...scaled)
  const exps = scaled.map((x) => Math.exp(x - max))
  const sum = exps.reduce((s, x) => s + x, 0)
  return exps.map((x) => x / sum)
}

export function softmaxRows(m: Mat, temperature = 1): Mat {
  return m.map((row) => softmax(row, temperature))
}

export function norm(v: Vec): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0))
}

export function layernorm(v: Vec, eps = 1e-5): Vec {
  const mean = v.reduce((s, x) => s + x, 0) / v.length
  const variance = v.reduce((s, x) => s + (x - mean) * (x - mean), 0) / v.length
  const std = Math.sqrt(variance + eps)
  return v.map((x) => (x - mean) / std)
}

export function addMat(a: Mat, b: Mat): Mat {
  return a.map((row, i) => row.map((x, j) => x + b[i][j]))
}

export function scaleMat(m: Mat, s: number): Mat {
  return m.map((row) => row.map((x) => x * s))
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export interface AttentionTrace {
  xNorm: Mat
  scores: Mat
  attn: Mat
  vProj: Mat
  delta: Mat
}

export function singleHeadAttention(x: Mat, wq: Mat, wk: Mat, wv: Mat): AttentionTrace {
  const d = x[0].length
  const xNorm = x.map(layernorm)
  const q = matmul(xNorm, wq)
  const k = matmul(xNorm, wk)
  const v = matmul(xNorm, wv)
  const scores = scaleMat(matmul(q, transpose(k)), 1 / Math.sqrt(d))
  const attn = softmaxRows(scores)
  const delta = matmul(attn, v)
  return { xNorm, scores, attn, vProj: v, delta }
}

export function initAttentionWeights(seed: number, d: number): { wq: Mat; wk: Mat; wv: Mat } {
  const rng = mulberry32(seed)
  const scale = 1 / Math.sqrt(d)
  return {
    wq: randnMat(rng, d, d, scale),
    wk: randnMat(rng, d, d, scale),
    wv: randnMat(rng, d, d, scale),
  }
}

export function initEmbeddings(seed: number, tokens: number, d: number): Mat {
  return randnMat(mulberry32(seed), tokens, d, 1)
}
