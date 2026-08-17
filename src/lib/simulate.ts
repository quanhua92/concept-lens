import { mulberry32, randn, type Vec } from './math'

export interface DepthSimResult {
  layerNormsWithResidual: number[]
  layerNormsWithoutResidual: number[]
  finalWith: number
  finalWithout: number
  baseNorm: number
}

export interface DepthSimParams {
  layers: number
  blockGain: number
  writeStrength: number
  dModel: number
  seed: number
}

/**
 * Toy model of a deep stack, tracking one representative token's stream vector.
 *
 * With residual:    x <- x + write  (each block adds a bounded delta)
 * Without residual: x <- g*x + write (signal must survive every block)
 *
 * Additive writes grow the norm like ~sqrt(L); the multiplicative path grows
 * like g^L — vanishing when g < 1, exploding when g > 1.
 */
export function simulateDepth({ layers, blockGain, writeStrength, dModel, seed }: DepthSimParams): DepthSimResult {
  const rng = mulberry32(seed)
  const x0: Vec = Array.from({ length: dModel }, () => randn(rng))
  const baseNorm = Math.sqrt(x0.reduce((s, x) => s + x * x, 0))

  let withRes = [...x0]
  let withoutRes = [...x0]
  const layerNormsWithResidual: number[] = [baseNorm]
  const layerNormsWithoutResidual: number[] = [baseNorm]

  for (let l = 0; l < layers; l++) {
    const u: Vec = Array.from({ length: dModel }, () => randn(rng))
    const uNorm = Math.sqrt(u.reduce((s, x) => s + x * x, 0))
    const write = u.map((x) => (x / uNorm) * writeStrength * baseNorm)

    withRes = withRes.map((x, i) => x + write[i])
    withoutRes = withoutRes.map((x, i) => blockGain * x + write[i])

    layerNormsWithResidual.push(Math.sqrt(withRes.reduce((s, x) => s + x * x, 0)))
    layerNormsWithoutResidual.push(Math.sqrt(withoutRes.reduce((s, x) => s + x * x, 0)))
  }

  return {
    layerNormsWithResidual,
    layerNormsWithoutResidual,
    finalWith: layerNormsWithResidual[layerNormsWithResidual.length - 1],
    finalWithout: layerNormsWithoutResidual[layerNormsWithoutResidual.length - 1],
    baseNorm,
  }
}

export interface GradientSimResult {
  layerGains: number[]
  withResidual: number[]
  withoutResidual: number[]
}

export interface GradientSimParams {
  layers: number
  blockGain: number
  noise: number
  seed: number
}

/**
 * Toy backward pass. Each block contributes a local Jacobian factor j_l
 * (scalar stand-in for J = dF/dx). The chain rule gives:
 *
 * With residual:    ds/dl = (1 + j_l) * s   — the +1 is the identity path
 * Without residual: ds/dl = j_l * s         — pure product of block Jacobians
 */
export function simulateGradient({ layers, blockGain, noise, seed }: GradientSimParams): GradientSimResult {
  const rng = mulberry32(seed)
  const layerGains: number[] = []
  for (let l = 0; l < layers; l++) {
    layerGains.push(blockGain + randn(rng) * noise)
  }

  const withResidual: number[] = new Array(layers).fill(1)
  const withoutResidual: number[] = new Array(layers).fill(1)

  let sWith = 1
  let sWithout = 1
  for (let l = layers - 1; l >= 0; l--) {
    sWith *= 1 + layerGains[l]
    sWithout *= layerGains[l]
    withResidual[l] = sWith
    withoutResidual[l] = sWithout
  }

  return { layerGains, withResidual, withoutResidual }
}
