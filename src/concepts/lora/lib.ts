import { randnMat, mulberry32, svdTop, svdReconstruct, relFrobeniusError, type Mat } from '@/lib/math'
import { QWEN } from '@/concepts/pruning/lib'

export interface RankExperiment {
  ranks: number[]
  structuredErr: number[]
  genericErr: number[]
}

export function rankExperiment(seed: number, rows = 40, cols = 30): { structured: Mat; generic: Mat; exp: RankExperiment } {
  const rng = mulberry32(seed)
  const A = randnMat(rng, 5, rows)
  const B = randnMat(rng, 5, cols)
  const noise = randnMat(rng, rows, cols, 0.06)
  const structured: Mat = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let s = 0
      for (let r = 0; r < 5; r++) s += A[r][i] * B[r][j]
      return s + noise[i][j]
    }),
  )
  const generic: Mat = randnMat(mulberry32(seed + 50), rows, cols, 1)
  const ranks = [1, 2, 3, 5, 8, 12, 16, 24]
  const sTerms = svdTop(structured, 24, seed + 1)
  const gTerms = svdTop(generic, 24, seed + 2)
  const structuredErr = ranks.map((r) => relFrobeniusError(structured, svdReconstruct(sTerms.slice(0, r))!))
  const genericErr = ranks.map((r) => relFrobeniusError(generic, svdReconstruct(gTerms.slice(0, r))!))
  return { structured, generic, exp: { ranks, structuredErr, genericErr } }
}

export function loraAdapterParams(rank: number, cfg = QWEN): number {
  const kvDim = cfg.kvHeads * cfg.headDim
  const perLayer =
    2 * rank * (cfg.dModel + cfg.dModel) +
    2 * rank * (cfg.dModel + kvDim) +
    3 * rank * (cfg.dModel + cfg.ffn)
  return perLayer * cfg.layers
}

export function totalParams(cfg = QWEN): number {
  const kvDim = cfg.kvHeads * cfg.headDim
  return (
    cfg.layers * (4 * cfg.dModel * cfg.dModel - 2 * cfg.dModel * (cfg.dModel - kvDim) + 3 * cfg.dModel * cfg.ffn) +
    2 * cfg.vocab * cfg.dModel
  )
}

export function makeAdapter(seed: number, rank: number, d: number): { A: Mat; B: Mat } {
  const A = randnMat(mulberry32(seed), rank, d, 0.05)
  const B: Mat = Array.from({ length: d }, () => new Array<number>(rank).fill(0))
  return { A, B }
}

export function deltaW(A: Mat, B: Mat, alpha: number): Mat {
  const rank = A.length
  const scale = alpha / rank
  const d = B.length
  return Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => {
    let s = 0
    for (let r = 0; r < rank; r++) s += B[i][r] * A[r][j]
    return s * scale
  }))
}
