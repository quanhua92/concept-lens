import { mulberry32 } from '@/lib/math'

export function uniformDist(n: number): number[] {
  return new Array(n).fill(1 / n)
}

export function mixDists(p: number[], u: number[], lam: number): number[] {
  return p.map((x, i) => lam * x + (1 - lam) * u[i])
}

export function theoreticalAcceptance(p: number[], q: number[]): number {
  return p.reduce((s, x, i) => s + Math.min(x, q[i]), 0)
}

function sampleCat(dist: number[], rng: () => number): number {
  let r = rng()
  for (let i = 0; i < dist.length; i++) {
    r -= dist[i]
    if (r < 0) return i
  }
  return dist.length - 1
}

export interface PassResult {
  drafted: number
  accepted: number
  tokensEmitted: number
  resampled: boolean
}

export function speculativePass(
  target: number[],
  draft: number[],
  rng: () => number,
  gamma: number,
): PassResult {
  let accepted = 0
  for (let k = 0; k < gamma; k++) {
    const x = sampleCat(draft, rng)
    const r = rng()
    if (r < Math.min(1, target[x] / Math.max(draft[x], 1e-12))) {
      accepted++
    } else {
      const residual = target.map((t, i) => Math.max(0, t - draft[i]))
      const sum = residual.reduce((a, b) => a + b, 0)
      if (sum > 0) sampleCat(residual.map((v) => v / sum), rng)
      return { drafted: accepted + 1, accepted, tokensEmitted: accepted + 1, resampled: true }
    }
  }
  sampleCat(target, rng)
  return { drafted: gamma, accepted, tokensEmitted: gamma + 1, resampled: false }
}

export interface EmpiricalResult {
  acceptanceRate: number
  tokensPerPass: number
  passes: number
  allAcceptedFrac: number
}

export function runExperiment(
  target: number[],
  draft: number[],
  gamma: number,
  passes: number,
  seed: number,
): EmpiricalResult {
  const rng = mulberry32(seed)
  let accepted = 0
  let drafted = 0
  let emitted = 0
  let all = 0
  for (let i = 0; i < passes; i++) {
    const r = speculativePass(target, draft, rng, gamma)
    accepted += r.accepted
    drafted += r.drafted
    emitted += r.tokensEmitted
    if (!r.resampled) all++
  }
  return {
    acceptanceRate: accepted / Math.max(drafted, 1),
    tokensPerPass: emitted / passes,
    passes,
    allAcceptedFrac: all / passes,
  }
}

export function expectedTokensPerPass(alpha: number, gamma: number): number {
  return (1 - Math.pow(alpha, gamma + 1)) / (1 - Math.max(alpha, 1e-9))
}

export function speedup(alpha: number, gamma: number, draftCost: number): number {
  const et = expectedTokensPerPass(alpha, gamma)
  return et / (1 + draftCost * gamma)
}

export function optimalGamma(alpha: number, draftCost: number): number {
  let best = 1
  let bestS = 0
  for (let g = 1; g <= 16; g++) {
    const s = speedup(alpha, g, draftCost)
    if (s > bestS) {
      bestS = s
      best = g
    }
  }
  return best
}
