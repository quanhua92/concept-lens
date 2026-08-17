import { mulberry32, randn, softmax, type Mat, type Vec } from '@/lib/math'

export const TOKENS = ['the', 'cat', 'sat', 'on', 'the', 'mat']

export function similarityMatrix(a: Mat, b: Mat): Mat {
  return a.map((row) => b.map((other) => row.reduce((s, x, i) => s + x * other[i], 0)))
}

export interface ScaleExperiment {
  dks: number[]
  rawStd: number[]
  scaledStd: number[]
  rawMaxProb: number[]
  scaledMaxProb: number[]
}

export function runScaleExperiment(seed: number, samples: number): ScaleExperiment {
  const dks = [2, 4, 8, 16, 32, 64, 128]
  const rawStd: number[] = []
  const scaledStd: number[] = []
  const rawMaxProb: number[] = []
  const scaledMaxProb: number[] = []
  for (const dk of dks) {
    const rng = mulberry32(seed * 31 + dk)
    const raw: number[] = []
    const scaled: number[] = []
    for (let s = 0; s < samples; s++) {
      const q: Vec = Array.from({ length: dk }, () => randn(rng))
      const k: Vec = Array.from({ length: dk }, () => randn(rng))
      const dot = q.reduce((acc, x, i) => acc + x * k[i], 0)
      raw.push(dot)
      scaled.push(dot / Math.sqrt(dk))
    }
    const std = (v: number[]) => {
      const mean = v.reduce((a, b) => a + b, 0) / v.length
      return Math.sqrt(v.reduce((a, x) => a + (x - mean) * (x - mean), 0) / v.length)
    }
    rawStd.push(std(raw))
    scaledStd.push(std(scaled))
    rawMaxProb.push(Math.max(...softmax(raw)))
    scaledMaxProb.push(Math.max(...softmax(scaled)))
  }
  return { dks, rawStd, scaledStd, rawMaxProb, scaledMaxProb }
}
