import { mulberry32, randn, type Vec } from '@/lib/math'

export interface RouterConfig {
  nExperts: number
  topK: number
}

export interface RouteDecision {
  token: number
  chosen: number[]
  gates: number[]
}

export interface BatchRouting {
  decisions: RouteDecision[]
  loads: Vec
  probsMean: Vec
  auxLoss: number
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function routeBatch(
  logits: Vec,
  tokenFeatures: number[][],
  topK: number,
  rng: () => number,
): BatchRouting {
  const nExperts = logits.length
  const decisions: RouteDecision[] = []
  const loads = new Array<number>(nExperts).fill(0)
  const probsSum = new Array<number>(nExperts).fill(0)

  tokenFeatures.forEach((feat, t) => {
    const affinity = logits.map((l, e) => sigmoid(l + feat[e] * 0.5))
    affinity.forEach((a, e) => (probsSum[e] += a))
    const order = affinity.map((a, e) => [a, e] as const).sort((x, y) => y[0] - x[0])
    const chosen = order.slice(0, topK).map(([, e]) => e)
    const gateSum = chosen.reduce((s, e) => s + affinity[e], 0)
    const gates = chosen.map((e) => affinity[e] / Math.max(gateSum, 1e-9))
    chosen.forEach((e) => (loads[e] += 1))
    decisions.push({ token: t, chosen, gates })
    void rng
  })

  const nTokens = tokenFeatures.length
  const f = loads.map((l) => l / nTokens)
  const p = probsSum.map((s) => s / nTokens)
  let aux = 0
  for (let e = 0; e < nExperts; e++) aux += f[e] * p[e]
  return { decisions, loads, probsMean: p, auxLoss: nExperts * aux }
}

export function makeTokenFeatures(seed: number, nTokens: number, nExperts: number): number[][] {
  const rng = mulberry32(seed)
  return Array.from({ length: nTokens }, () =>
    Array.from({ length: nExperts }, () => randn(rng)),
  )
}

export function initRouterLogits(seed: number, nExperts: number): Vec {
  const rng = mulberry32(seed)
  return Array.from({ length: nExperts }, () => randn(rng) * 0.3)
}

export interface BalanceRun {
  steps: number
  maxLoadFrac: number[]
  auxLoss: number[]
  entropy: number[]
}

export function trainRouter(
  seed: number,
  nExperts: number,
  topK: number,
  steps: number,
  auxWeight: number,
  reinforce: boolean,
  nTokens = 256,
): { run: BalanceRun; finalLoads: Vec; initLoads: Vec } {
  const rng = mulberry32(seed)
  const feats = makeTokenFeatures(seed + 1, nTokens, nExperts)
  let logits = initRouterLogits(seed, nExperts)
  const run: BalanceRun = { steps, maxLoadFrac: [], auxLoss: [], entropy: [] }

  const first = routeBatch(logits, feats, topK, rng)
  const initLoads = [...first.loads]

  for (let s = 0; s < steps; s++) {
    const batch = routeBatch(logits, feats, topK, rng)
    run.maxLoadFrac.push(Math.max(...batch.loads) / nTokens)
    run.auxLoss.push(batch.auxLoss)
    run.entropy.push(
      -batch.loads
        .map((l) => (l > 0 ? (l / nTokens) * Math.log2(l / nTokens) : 0))
        .reduce((a, b) => a + b, 0),
    )
    const grad = logits.map((l, e) => {
      const p = sigmoid(l)
      return nExperts * batch.loads[e] / nTokens * p * (1 - p)
    })
    logits = logits.map((l, e) => l - auxWeight * 0.5 * grad[e] * nTokens / (topK * nExperts))
    if (reinforce) {
      logits = logits.map((l, e) => l + 0.02 * (batch.loads[e] / nTokens) * nExperts - 0.02)
    }
  }
  const final = routeBatch(logits, feats, topK, rng)
  return { run, finalLoads: final.loads, initLoads }
}

export const V3_MOE = {
  routedExperts: 256,
  sharedExperts: 1,
  topK: 8,
  moeLayers: 58,
  denseLayers: 3,
  totalParams: 671e9,
  activeParams: 37e9,
  expertIntermediate: 2048,
  denseIntermediate: 18432,
}

export function activeFraction(nExperts: number, topK: number, shared: number): number {
  return (topK + shared) / (nExperts + shared)
}
