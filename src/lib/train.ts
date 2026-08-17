import { mulberry32, randn, type Mat, type Vec } from './math'

export interface MLP {
  sizes: number[]
  Ws: Mat[]
  bs: Vec[]
}

function heInit(rng: () => number, fanIn: number, fanOut: number): Mat {
  const s = Math.sqrt(2 / fanIn)
  return Array.from({ length: fanOut }, () => Array.from({ length: fanIn }, () => randn(rng) * s))
}

export function initMLP(sizes: number[], seed: number): MLP {
  const rng = mulberry32(seed)
  const Ws: Mat[] = []
  const bs: Vec[] = []
  for (let l = 0; l < sizes.length - 1; l++) {
    Ws.push(heInit(rng, sizes[l], sizes[l + 1]))
    bs.push(new Array(sizes[l + 1]).fill(0))
  }
  return { sizes, Ws, bs }
}

export function cloneNet(net: MLP): MLP {
  return {
    sizes: [...net.sizes],
    Ws: net.Ws.map((w) => w.map((r) => [...r])),
    bs: net.bs.map((b) => [...b]),
  }
}

export interface Forward {
  acts: Mat[]
  pre: Mat[]
}

export function forwardMLP(net: MLP, X: Mat): Forward {
  const acts: Mat[] = [X]
  const pre: Mat[] = []
  let a = X
  for (let l = 0; l < net.Ws.length; l++) {
    const z: Mat = a.map((row) => {
      const out = new Array(net.Ws[l].length).fill(0)
      for (let j = 0; j < out.length; j++) {
        let s = net.bs[l][j]
        for (let i = 0; i < row.length; i++) s += row[i] * net.Ws[l][j][i]
        out[j] = s
      }
      return out
    })
    pre.push(z)
    const isLast = l === net.Ws.length - 1
    a = isLast ? z : z.map((r) => r.map((v) => (v > 0 ? v : 0)))
    acts.push(a)
  }
  return { acts, pre }
}

export function mseLoss(out: Mat, Y: Mat): number {
  let s = 0
  for (let n = 0; n < out.length; n++) {
    for (let j = 0; j < out[n].length; j++) {
      const d = out[n][j] - Y[n][j]
      s += d * d
    }
  }
  return s / (out.length * out[0].length)
}

export function trainSteps(net: MLP, X: Mat, Y: Mat, steps: number, lr: number): number[] {
  const L = net.Ws.length
  const n = X.length
  const losses: number[] = []
  for (let s = 0; s < steps; s++) {
    const { acts, pre } = forwardMLP(net, X)
    losses.push(mseLoss(acts[L], Y))
    let delta: Mat = acts[L].map((row, i) => row.map((v, j) => (2 * (v - Y[i][j])) / (n * row.length)))
    for (let l = L - 1; l >= 0; l--) {
      const gW: Mat = net.Ws[l].map((wRow) => wRow.map(() => 0))
      const gb: Vec = new Array(net.Ws[l].length).fill(0)
      for (let b = 0; b < n; b++) {
        for (let j = 0; j < net.Ws[l].length; j++) {
          gb[j] += delta[b][j]
          for (let i = 0; i < net.Ws[l][0].length; i++) {
            gW[j][i] += delta[b][j] * acts[l][b][i]
          }
        }
      }
      if (l > 0) {
        const newDelta: Mat = X.map(() => new Array(net.Ws[l - 1].length).fill(0))
        for (let b = 0; b < n; b++) {
          for (let i = 0; i < net.Ws[l][0].length; i++) {
            let acc = 0
            for (let j = 0; j < net.Ws[l].length; j++) acc += delta[b][j] * net.Ws[l][j][i]
            newDelta[b][i] = pre[l - 1][b][i] > 0 ? acc : 0
          }
        }
        delta = newDelta
      }
      for (let j = 0; j < net.Ws[l].length; j++) {
        net.bs[l][j] -= lr * gb[j]
        for (let i = 0; i < net.Ws[l][0].length; i++) net.Ws[l][j][i] -= lr * gW[j][i]
      }
    }
  }
  return losses
}

export function softmaxVec(v: Vec, temperature = 1): Vec {
  const scaled = v.map((x) => x / temperature)
  const max = Math.max(...scaled)
  const exps = scaled.map((x) => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

export function trainStepsDistill(
  net: MLP,
  X: Mat,
  teacher: MLP,
  steps: number,
  lr: number,
  temperature: number,
  mode: 'kd' | 'hard',
  Y?: Mat,
): number[] {
  const L = net.Ws.length
  const n = X.length
  const T = mode === 'kd' ? temperature : 1
  const teacherOut = forwardMLP(teacher, X).acts[L]
  const hardTarget = Y ? Y.map((r) => argmax(r)) : teacherOut.map((r) => argmax(r))
  const losses: number[] = []
  for (let s = 0; s < steps; s++) {
    const { acts, pre } = forwardMLP(net, X)
    const out = acts[L]
    let loss = 0
    const delta: Mat = out.map((row, b) => {
      const ps = softmaxVec(row, T)
      const pt = mode === 'kd' ? softmaxVec(teacherOut[b], T) : oneHot(hardTarget[b], row.length)
      const d = row.map((_, i) => (ps[i] - pt[i]) / (T * T))
      for (let i = 0; i < row.length; i++) {
        loss += pt[i] > 0 ? -pt[i] * Math.log(Math.max(ps[i], 1e-12)) : 0
      }
      return d
    })
    losses.push(loss / n)
    for (let l = L - 1; l >= 0; l--) {
      const gW: Mat = net.Ws[l].map((wRow) => wRow.map(() => 0))
      const gb: Vec = new Array(net.Ws[l].length).fill(0)
      for (let b2 = 0; b2 < n; b2++) {
        for (let j = 0; j < net.Ws[l].length; j++) {
          gb[j] += delta[b2][j]
          for (let i = 0; i < net.Ws[l][0].length; i++) gW[j][i] += delta[b2][j] * acts[l][b2][i]
        }
      }
      const newDelta: Mat = l > 0 ? X.map(() => new Array(net.Ws[l][0].length).fill(0)) : []
      if (l > 0) {
        for (let b2 = 0; b2 < n; b2++) {
          for (let i = 0; i < net.Ws[l][0].length; i++) {
            let acc = 0
            for (let j = 0; j < net.Ws[l].length; j++) acc += delta[b2][j] * net.Ws[l][j][i]
            newDelta[b2][i] = pre[l - 1][b2][i] > 0 ? acc : 0
          }
        }
      }
      for (let j = 0; j < net.Ws[l].length; j++) {
        net.bs[l][j] -= lr * gb[j]
        for (let i = 0; i < net.Ws[l][0].length; i++) net.Ws[l][j][i] -= lr * gW[j][i]
      }
      if (l > 0) {
        for (let b2 = 0; b2 < n; b2++) delta[b2] = newDelta[b2]
      }
    }
  }
  return losses
}

function argmax(v: Vec): number {
  let bi = 0
  for (let i = 1; i < v.length; i++) if (v[i] > v[bi]) bi = i
  return bi
}

function oneHot(i: number, n: number): Vec {
  return Array.from({ length: n }, (_, k) => (k === i ? 1 : 0))
}

export function makeRegressionTask(seed: number, n: number, inD: number, outD: number): { X: Mat; Y: Mat; teacher: MLP } {
  const teacher = initMLP([inD, 32, 32, outD], seed)
  const rng = mulberry32(seed + 7)
  const X: Mat = Array.from({ length: n }, () => Array.from({ length: inD }, () => randn(rng)))
  const Y = forwardMLP(teacher, X).acts[teacher.Ws.length]
  return { X, Y, teacher }
}

export function pruneHiddenUnits(net: MLP, layer: number, keep: number[]): MLP {
  const sizes = [...net.sizes]
  sizes[layer + 1] = keep.length
  const Ws = net.Ws.map((w) => w.map((r) => [...r]))
  const bs = net.bs.map((b) => [...b])
  Ws[layer] = keep.map((j) => [...net.Ws[layer][j]])
  bs[layer] = keep.map((j) => net.bs[layer][j])
  for (let j = 0; j < Ws[layer + 1].length; j++) {
    Ws[layer + 1][j] = keep.map((i) => net.Ws[layer + 1][j][i])
  }
  return { sizes, Ws, bs }
}

export function magnitudeImportance(net: MLP, layer: number): number[] {
  return net.Ws[layer].map((row) => row.reduce((s, w) => s + Math.abs(w), 0))
}

export function taylorImportance(net: MLP, X: Mat, layer: number): number[] {
  const { acts, pre } = forwardMLP(net, X)
  const L = net.Ws.length
  let delta: Mat = acts[L].map((row) => row.map((v) => 2 * v))
  for (let l = L - 1; l > layer; l--) {
    const newDelta: Mat = X.map(() => new Array(net.Ws[l - 1].length).fill(0))
    for (let b = 0; b < X.length; b++) {
      for (let i = 0; i < net.Ws[l][0].length; i++) {
        let acc = 0
        for (let j = 0; j < net.Ws[l].length; j++) acc += delta[b][j] * net.Ws[l][j][i]
        newDelta[b][i] = pre[l - 1][b][i] > 0 ? acc : 0
      }
    }
    delta = newDelta
  }
  const units = net.Ws[layer].length
  const imp = new Array(units).fill(0)
  for (let j = 0; j < units; j++) {
    let s = 0
    for (let b = 0; b < X.length; b++) s += Math.abs(acts[layer + 1][b][j] * delta[b][j])
    imp[j] = s / X.length
  }
  return imp
}

export function topIndices(v: Vec, k: number): number[] {
  return v
    .map((val, i) => [val, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([, i]) => i)
}
