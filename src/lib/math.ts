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

export function causalMask(n: number): boolean[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j <= i))
}

export function applyMask(scores: Mat, mask: boolean[][]): Mat {
  return scores.map((row, i) => row.map((v, j) => (mask[i][j] ? v : -Infinity)))
}

export function sliceCols(m: Mat, start: number, len: number): Mat {
  return m.map((row) => row.slice(start, start + len))
}

export function concatCols(mats: Mat[]): Mat {
  return mats[0].map((_, i) => mats.flatMap((m) => m[i]))
}

export interface HeadTrace {
  q: Mat
  k: Mat
  v: Mat
  scores: Mat
  attn: Mat
  out: Mat
}

export interface MHAResult {
  heads: HeadTrace[]
  out: Mat
}

export function multiHeadAttention(
  x: Mat,
  wq: Mat,
  wk: Mat,
  wv: Mat,
  wo: Mat,
  nHeads: number,
  opts?: { causal?: boolean; temperature?: number },
): MHAResult {
  const d = x[0].length
  const dh = d / nHeads
  const q = matmul(x, wq)
  const k = matmul(x, wk)
  const v = matmul(x, wv)
  const mask = opts?.causal ? causalMask(x.length) : null
  const heads: HeadTrace[] = []
  for (let h = 0; h < nHeads; h++) {
    const qh = sliceCols(q, h * dh, dh)
    const kh = sliceCols(k, h * dh, dh)
    const vh = sliceCols(v, h * dh, dh)
    let scores = scaleMat(matmul(qh, transpose(kh)), 1 / Math.sqrt(dh))
    if (mask) scores = applyMask(scores, mask)
    const attn = softmaxRows(scores, opts?.temperature ?? 1)
    heads.push({ q: qh, k: kh, v: vh, scores, attn, out: matmul(attn, vh) })
  }
  const concat = concatCols(heads.map((h) => h.out))
  return { heads, out: matmul(concat, wo) }
}

export function initMHAWeights(seed: number, d: number, nHeads: number): { wq: Mat; wk: Mat; wv: Mat; wo: Mat } {
  const dh = d / nHeads
  const make = (name: 'q' | 'k' | 'v' | 'o'): Mat => {
    const full: Mat = Array.from({ length: d }, () => new Array<number>(d).fill(0))
    for (let h = 0; h < nHeads; h++) {
      const rng = mulberry32(seed * 7919 + h * 101 + name.charCodeAt(0))
      const scale = name === 'o' ? 1 / Math.sqrt(d) : 1 / Math.sqrt(dh)
      const block = randnMat(rng, dh, dh, scale)
      for (let i = h * dh; i < (h + 1) * dh; i++) {
        for (let j = h * dh; j < (h + 1) * dh; j++) full[i][j] = block[i - h * dh][j - h * dh]
      }
    }
    return full
  }
  return { wq: make('q'), wk: make('k'), wv: make('v'), wo: make('o') }
}

export function topKMask(logits: Vec, k: number): boolean[] {
  const order = logits.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
  const mask = new Array<boolean>(logits.length).fill(false)
  for (let i = 0; i < Math.min(k, logits.length); i++) mask[order[i][1]] = true
  return mask
}

export function topPMask(probs: Vec, p: number): boolean[] {
  const order = probs.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
  const mask = new Array<boolean>(probs.length).fill(false)
  let cum = 0
  for (let i = 0; i < order.length; i++) {
    mask[order[i][1]] = true
    cum += order[i][0]
    if (cum >= p) break
  }
  return mask
}

export function sampleFromLogits(
  logits: Vec,
  rng: () => number,
  temperature = 1,
  topK?: number,
  topP?: number,
): { index: number; probs: Vec } {
  const t = Math.max(temperature, 1e-4)
  let work = softmax(logits, t)
  if (topK !== undefined && topK >= 1 && topK < logits.length) {
    const mask = topKMask(logits, topK)
    work = work.map((p, i) => (mask[i] ? p : 0))
  }
  if (topP !== undefined && topP < 1) {
    const mask = topPMask(work, topP)
    work = work.map((p, i) => (mask[i] ? p : 0))
  }
  const sum = work.reduce((a, b) => a + b, 0)
  work = work.map((p) => p / sum)
  const r = rng()
  let cum = 0
  for (let i = 0; i < work.length; i++) {
    cum += work[i]
    if (r < cum) return { index: i, probs: work }
  }
  return { index: work.length - 1, probs: work }
}

export function klFwd(p: Vec, q: Vec): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) s += p[i] * Math.log(p[i] / Math.max(q[i], 1e-12))
  }
  return s
}

export function klRev(p: Vec, q: Vec): number {
  return klFwd(q, p)
}

export function klGaussian(muP: number, sdP: number, muQ: number, sdQ: number): number {
  return Math.log(sdQ / sdP) + (sdP * sdP + (muP - muQ) * (muP - muQ)) / (2 * sdQ * sdQ) - 0.5
}

export function klNumeric(
  pdfP: (x: number) => number,
  pdfQ: (x: number) => number,
  lo: number,
  hi: number,
  n = 2000,
): number {
  const h = (hi - lo) / n
  let s = 0
  for (let i = 0; i <= n; i++) {
    const x = lo + i * h
    const w = i === 0 || i === n ? 0.5 : 1
    const p = pdfP(x)
    const q = Math.max(pdfQ(x), 1e-300)
    if (p > 0) s += w * p * Math.log(p / q)
  }
  return s * h
}

export function gaussPdf(x: number, mu: number, sd: number): number {
  const z = (x - mu) / sd
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
}

export interface QuantResult {
  deq: number[]
  q: number[]
  scale: number
  rmse: number
  bits: number
}

export function quantizeSym(v: number[], bits: number): QuantResult {
  const levels = Math.pow(2, bits) - 1
  const amax = Math.max(...v.map(Math.abs), 1e-12)
  const scale = amax / levels
  const q = v.map((x) => Math.round(clamp(x / scale, -levels, levels)))
  const deq = q.map((x) => x * scale)
  const rmse = Math.sqrt(v.reduce((s, x, i) => s + (x - deq[i]) * (x - deq[i]), 0) / v.length)
  return { deq, q, scale, rmse, bits }
}

export interface FloatFormat {
  name: string
  eBits: number
  mBits: number
  bias: number
  hasInf: boolean
}

export const FMT_FP16: FloatFormat = { name: 'FP16', eBits: 5, mBits: 10, bias: 15, hasInf: true }
export const FMT_BF16: FloatFormat = { name: 'BF16', eBits: 8, mBits: 7, bias: 127, hasInf: true }
export const FMT_E4M3: FloatFormat = { name: 'E4M3', eBits: 4, mBits: 3, bias: 7, hasInf: false }
export const FMT_E5M2: FloatFormat = { name: 'E5M2', eBits: 5, mBits: 2, bias: 15, hasInf: true }

export function floatBits(v: number, fmt: FloatFormat): number {
  const { eBits, mBits, bias, hasInf } = fmt
  const total = 1 + eBits + mBits
  const sign = v < 0 || Object.is(v, -0) ? 1 : 0
  const a = Math.abs(v)
  if (Number.isNaN(a)) return ((sign << (total - 1)) | ((1 << (eBits + mBits)) - 1)) >>> 0
  if (a === 0) return sign << (total - 1)
  const mantScale = 1 << mBits
  const emin = 1 - bias
  const maxExpField = (1 << eBits) - 1
  if (a < Math.pow(2, emin)) {
    const step = Math.pow(2, emin - mBits)
    let m = Math.round(a / step)
    if (m >= mantScale) return ((sign << (total - 1)) | (1 << mBits)) >>> 0
    return ((sign << (total - 1)) | m) >>> 0
  }
  let e = Math.floor(Math.log2(a))
  while (Math.pow(2, e + 1) <= a) e++
  while (Math.pow(2, e) > a) e--
  const frac = a / Math.pow(2, e) - 1
  let mant = Math.round(frac * mantScale)
  let expField = e + bias
  if (mant >= mantScale) {
    mant = 0
    expField += 1
  }
  if (hasInf) {
    if (expField >= maxExpField) {
      return ((sign << (total - 1)) | (maxExpField << mBits)) >>> 0
    }
  } else if (expField > maxExpField || (expField === maxExpField && mant === mantScale - 1)) {
    expField = maxExpField
    mant = mantScale - 2
  }
  return ((sign << (total - 1)) | (expField << mBits) | mant) >>> 0
}

export function fromFloatBits(bits: number, fmt: FloatFormat): number {
  const { eBits, mBits, bias, hasInf } = fmt
  const maxExpField = (1 << eBits) - 1
  const sign = bits >> (eBits + mBits) & 1 ? -1 : 1
  const ef = (bits >> mBits) & maxExpField
  const m = bits & ((1 << mBits) - 1)
  if (ef === maxExpField) {
    if (hasInf) return m === 0 ? sign * Infinity : NaN
    return m === (1 << mBits) - 1 ? NaN : sign * (1 + m / (1 << mBits)) * Math.pow(2, maxExpField - bias)
  }
  if (ef === 0) return sign * (m / (1 << mBits)) * Math.pow(2, 1 - bias)
  return sign * (1 + m / (1 << mBits)) * Math.pow(2, ef - bias)
}

export function bitsToString(bits: number, fmt: FloatFormat): string {
  const total = 1 + fmt.eBits + fmt.mBits
  let s = ''
  for (let i = total - 1; i >= 0; i--) s += (bits >> i) & 1
  return s
}

export function floatGrid(fmt: FloatFormat, lo: number, hi: number): number[] {
  const total = 1 << (1 + fmt.eBits + fmt.mBits)
  const vals: number[] = []
  for (let b = 0; b < total; b++) {
    const v = fromFloatBits(b, fmt)
    if (Number.isFinite(v) && v >= lo && v <= hi) vals.push(v)
  }
  return vals.sort((a, b) => a - b)
}

export function floatMaxFinite(fmt: FloatFormat): number {
  const maxExpField = fmt.hasInf ? (1 << fmt.eBits) - 2 : (1 << fmt.eBits) - 1
  const mMax = fmt.hasInf ? (1 << fmt.mBits) - 1 : (1 << fmt.mBits) - 2
  return (1 + mMax / (1 << fmt.mBits)) * Math.pow(2, maxExpField - fmt.bias)
}
