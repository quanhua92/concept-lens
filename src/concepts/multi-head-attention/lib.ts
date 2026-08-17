import { useMemo } from 'react'
import { initEmbeddings, matmul, multiHeadAttention, initMHAWeights, type Mat, type MHAResult } from '@/lib/math'

export const TOKENS = ['data', 'is', 'the', 'new', 'oil', 'now']

export interface HeadInfo {
  index: number
  attn: Mat
  entropy: number
  peakTarget: number
}

export function entropyOfRow(row: number[]): number {
  return -row.reduce((s, p) => (p > 1e-12 ? s + p * Math.log2(p) : s), 0)
}

export function runHeads(seed: number, nHeads: number, tokens: number, d: number): { result: MHAResult; heads: HeadInfo[]; x: Mat; wo: Mat } {
  const x = initEmbeddings(seed, tokens, d)
  const w = initMHAWeights(seed + 3, d, nHeads)
  const result = multiHeadAttention(x, w.wq, w.wk, w.wv, w.wo, nHeads, { causal: true })
  const heads: HeadInfo[] = result.heads.map((h, i) => {
    const lastRow = h.attn[h.attn.length - 1]
    return {
      index: i,
      attn: h.attn,
      entropy: entropyOfRow(lastRow),
      peakTarget: lastRow.indexOf(Math.max(...lastRow)),
    }
  })
  return { result, heads, x, wo: w.wo }
}

export function dropHeads(result: MHAResult, activeMask: boolean[], d: number, nHeads: number, wo: Mat): Mat {
  const dh = d / nHeads
  const kept = result.heads.map((h, i) => ({ h, i })).filter(({ i }) => activeMask[i])
  const merged: Mat = result.out.map((_row, r) => {
    const full = new Array<number>(d).fill(0)
    for (const { h, i } of kept) {
      for (let j = 0; j < dh; j++) full[i * dh + j] = h.out[r][j]
    }
    return full
  })
  return matmul(merged, wo)
}

export function relativeChange(a: Mat, b: Mat): number {
  const na = Math.sqrt(a.flat().reduce((s, v) => s + v * v, 0))
  const diff = Math.sqrt(a.flat().reduce((s, v, i) => s + (v - b.flat()[i]) ** 2, 0))
  return na > 0 ? diff / na : 0
}

export function useHeadRun(seed: number, nHeads: number) {
  return useMemo(() => runHeads(seed, nHeads, TOKENS.length, 8), [seed, nHeads])
}
