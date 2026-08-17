export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function dpoLoss(margin: number, beta: number): number {
  return -Math.log(Math.max(sigmoid(beta * margin), 1e-12))
}

export function dpoGrad(margin: number, beta: number): number {
  return beta * sigmoid(-beta * margin)
}

export interface PreferencePair {
  name: string
  chosenMargin: number
  rejectedMargin: number
}

export const PAIRS: PreferencePair[] = [
  { name: 'clear win', chosenMargin: 2.2, rejectedMargin: -1.0 },
  { name: 'both high', chosenMargin: 1.8, rejectedMargin: 1.2 },
  { name: 'hard case', chosenMargin: -0.4, rejectedMargin: -0.2 },
]

export function pairMargin(p: PreferencePair): number {
  return p.chosenMargin - p.rejectedMargin
}

export interface GrpoBanditConfig {
  rewards: number[]
  groupSize: number
  steps: number
  lr: number
  betaKl: number
  seed: number
  noise: number
}

export interface GrpoRun {
  probsHistory: number[][]
  meanReward: number[]
  klHistory: number[]
  refProbs: number[]
  finalProbs: number[]
}

function softmaxT(logits: number[], t: number): number[] {
  const scaled = logits.map((l) => l / t)
  const m = Math.max(...scaled)
  const e = scaled.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}

export function runGrpoBandit(cfg: GrpoBanditConfig): GrpoRun {
  const rng = (function mulberryLite(seed: number) {
    let a = seed >>> 0
    return () => {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })(cfg.seed)

  const refProbs = softmaxT(cfg.rewards.map((r) => r * 0.8), 1)
  let logits = refProbs.map((p) => Math.log(Math.max(p, 1e-9)))
  const probsHistory: number[][] = []
  const meanReward: number[] = []
  const klHistory: number[] = []

  for (let s = 0; s < cfg.steps; s++) {
    const probs = softmaxT(logits, 1)
    probsHistory.push(probs)
    const mean = cfg.rewards.reduce((a, b) => a + b, 0) / cfg.rewards.length
    let m = 0
    for (let i = 0; i < cfg.rewards.length; i++) m += probs[i] * cfg.rewards[i]
    meanReward.push(m)
    let kl = 0
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > 0 && refProbs[i] > 0) kl += probs[i] * Math.log(probs[i] / refProbs[i])
    }
    klHistory.push(kl)

    const sampled: number[] = []
    for (let g = 0; g < cfg.groupSize; g++) {
      let r = rng()
      let a = 0
      for (let i = 0; i < probs.length; i++) {
        r -= probs[i]
        if (r < 0) {
          a = i
          break
        }
      }
      sampled.push(a)
    }
    const rewards = sampled.map((a) => cfg.rewards[a] + (rng() - 0.5) * cfg.noise)
    const rMean = rewards.reduce((a, b) => a + b, 0) / rewards.length
    const rVar = rewards.reduce((acc, r) => acc + (r - rMean) ** 2, 0) / rewards.length
    const rStd = Math.sqrt(rVar + 1e-8)
    const adv = rewards.map((r) => (r - rMean) / rStd)

    const grad = new Array(logits.length).fill(0)
    sampled.forEach((a, g) => {
      for (let i = 0; i < logits.length; i++) {
        grad[i] += (adv[g] * ((i === a ? 1 : 0) - probs[i])) / cfg.groupSize
        grad[i] -= (cfg.betaKl * (probs[i] - refProbs[i])) / cfg.groupSize
      }
    })
    logits = logits.map((l, i) => l + cfg.lr * grad[i] * 8)
    void mean
  }

  return { probsHistory, meanReward, klHistory, refProbs, finalProbs: softmaxT(logits, 1) }
}
