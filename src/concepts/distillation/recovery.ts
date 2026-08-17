import {
  accuracy,
  cloneNet,
  initMLP,
  pruneHiddenUnits,
  taylorImportance,
  topIndices,
  trainStepsDistill,
  type MLP,
} from '@/lib/train'
import { mulberry32, randn } from '@/lib/math'

export interface RecoveryScene {
  train: { X: number[][]; labels: number[]; classes: number }
  test: { X: number[][]; labels: number[]; classes: number }
  teacher: MLP
  full: MLP
  pruned: MLP
  onehots: number[][]
  teacherAcc: number
  fullAcc: number
  prunedAcc: number
}

function makeMeans(seed: number, classes: number, sep: number): number[][] {
  const rng = mulberry32(seed)
  return Array.from({ length: classes }, () => Array.from({ length: 8 }, () => randn(rng) * sep))
}

function sample(means: number[][], seed: number, n: number, noise: number) {
  const rng = mulberry32(seed)
  const X: number[][] = []
  const labels: number[] = []
  for (let i = 0; i < n; i++) {
    const c = i % means.length
    X.push(means[c].map((m) => m + randn(rng) * noise))
    labels.push(c)
  }
  return { X, labels, classes: means.length }
}

export function buildScene(): RecoveryScene {
  const means = makeMeans(1, 6, 0.9)
  const train = sample(means, 42, 32, 1.0)
  const test = sample(means, 99, 180, 1.0)
  const onehots = train.labels.map((c) => Array.from({ length: 6 }, (_, k) => (k === c ? 1 : 0)))

  const teacher = initMLP([8, 32, 32, 6], 7)
  trainStepsDistill(teacher, train.X, teacher, 500, 0.3, 1, 'hard', onehots)

  const full = initMLP([8, 12, 12, 6], 100)
  trainStepsDistill(full, train.X, full, 500, 0.3, 1, 'hard', onehots)

  const pruned = pruneHiddenUnits(full, 1, topIndices(taylorImportance(full, train.X, 1), 4))

  return {
    train,
    test,
    onehots,
    teacher,
    full,
    pruned,
    teacherAcc: accuracy(teacher, test),
    fullAcc: accuracy(full, test),
    prunedAcc: accuracy(pruned, test),
  }
}

export interface RecoveryRun {
  curve: number[]
  finalAcc: number
}

export function recoveryCurve(
  scene: RecoveryScene,
  mode: 'kd' | 'hard',
  temperature: number,
  chunks = 8,
  stepsPerChunk = 60,
): RecoveryRun {
  const s = cloneNet(scene.pruned)
  const curve: number[] = []
  for (let c = 0; c < chunks; c++) {
    trainStepsDistill(s, scene.train.X, scene.full, stepsPerChunk, 0.3, mode === 'kd' ? temperature : 1, mode, scene.onehots)
    curve.push(accuracy(s, scene.test))
  }
  return { curve, finalAcc: curve[curve.length - 1] }
}
