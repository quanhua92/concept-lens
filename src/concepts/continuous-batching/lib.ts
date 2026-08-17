import { mulberry32 } from '@/lib/math'

export interface RequestSpec {
  id: number
  arrivalMs: number
  promptLen: number
  genLen: number
}

export function generateRequests(seed: number, n: number, arrivalRatePerSec: number): RequestSpec[] {
  const rng = mulberry32(seed)
  const reqs: RequestSpec[] = []
  let t = 0
  for (let i = 0; i < n; i++) {
    t += (1000 / arrivalRatePerSec) * (0.4 + rng() * 1.2)
    reqs.push({
      id: i,
      arrivalMs: t,
      promptLen: 64 + Math.floor(rng() * 192),
      genLen: 48 + Math.floor(rng() * 208),
    })
  }
  return reqs
}

export interface Segment {
  reqId: number
  startMs: number
  endMs: number
}

export interface SimResult {
  segments: Segment[]
  totalMs: number
  throughputReqPerSec: number
  avgLatencyMs: number
  p99LatencyMs: number
  wastedSlotPct: number
  gpuBusyPct: number
  maxBatchSeen: number
}

const WEIGHTS_BYTES = 7.62e9 * 2
const KV_BYTES_PER_TOKEN = 2 * 28 * 4 * 128 * 2
const BW_BYTES_PER_MS = 1008e9 / 1000

export function iterationMs(batchKvTokens: number): number {
  return (WEIGHTS_BYTES + batchKvTokens * KV_BYTES_PER_TOKEN) / BW_BYTES_PER_MS
}

interface Slot {
  reqId: number
  progress: number
  startMs: number
  finishedMs: number | null
}

export function simulateStatic(reqs: RequestSpec[], maxBatch: number): SimResult {
  const segments: Segment[] = []
  const finishMs: number[] = new Array(reqs.length).fill(0)
  const sorted = [...reqs].sort((a, b) => a.arrivalMs - b.arrivalMs)
  let clock = 0
  let busyMs = 0
  let slotCapacityMs = 0
  let wastedSlotMs = 0
  let maxBatchSeen = 0

  for (let base = 0; base < sorted.length; base += maxBatch) {
    const group = sorted.slice(base, base + maxBatch)
    const batchStart = Math.max(clock, group[group.length - 1].arrivalMs)
    const slots: Slot[] = group.map((r) => ({ reqId: r.id, progress: 0, startMs: batchStart, finishedMs: null }))
    maxBatchSeen = Math.max(maxBatchSeen, group.length)
    let t = batchStart
    let active = group.length
    while (active > 0) {
      const kvTokens = slots.reduce((s, sl) => (sl.finishedMs === null ? s + reqs[sl.reqId].promptLen + sl.progress : s), 0)
      const iterMs = iterationMs(kvTokens)
      busyMs += iterMs
      slotCapacityMs += maxBatch * iterMs
      wastedSlotMs += (maxBatch - active) * iterMs
      t += iterMs
      for (const sl of slots) {
        if (sl.finishedMs === null) {
          sl.progress += 1
          if (sl.progress >= reqs[sl.reqId].genLen) {
            sl.finishedMs = t
            finishMs[sl.reqId] = t
            active--
          }
        }
      }
    }
    for (const sl of slots) {
      segments.push({ reqId: sl.reqId, startMs: sl.startMs, endMs: sl.finishedMs ?? t })
    }
    clock = t
  }

  return finalize(segments, finishMs, reqs, busyMs, slotCapacityMs, wastedSlotMs, maxBatchSeen)
}

export function simulateContinuous(reqs: RequestSpec[], maxBatch: number): SimResult {
  const segments: Segment[] = []
  const finishMs: number[] = new Array(reqs.length).fill(0)
  const slots = new Map<number, Slot>()
  const pending = [...reqs.keys()].sort((a, b) => reqs[a].arrivalMs - reqs[b].arrivalMs)
  let nextArrival = 0
  let clock = 0
  let busyMs = 0
  let slotCapacityMs = 0
  let wastedSlotMs = 0
  let maxBatchSeen = 0

  while (nextArrival < pending.length || slots.size > 0) {
    while (nextArrival < pending.length && reqs[pending[nextArrival]].arrivalMs <= clock && slots.size < maxBatch) {
      const id = pending[nextArrival]
      slots.set(id, { reqId: id, progress: 0, startMs: clock, finishedMs: null })
      nextArrival++
    }
    if (slots.size === 0) {
      clock = reqs[pending[nextArrival]].arrivalMs
      continue
    }
    maxBatchSeen = Math.max(maxBatchSeen, slots.size)
    const kvTokens = [...slots.values()].reduce((s, sl) => s + reqs[sl.reqId].promptLen + sl.progress, 0)
    const iterMs = iterationMs(kvTokens)
    busyMs += iterMs
    slotCapacityMs += maxBatch * iterMs
    const active = slots.size
    wastedSlotMs += (maxBatch - active) * iterMs
    for (const sl of slots.values()) {
      sl.progress += 1
      if (sl.progress >= reqs[sl.reqId].genLen) {
        sl.finishedMs = clock + iterMs
        finishMs[sl.reqId] = clock + iterMs
      }
    }
    for (const sl of [...slots.values()]) {
      if (sl.finishedMs !== null) {
        segments.push({ reqId: sl.reqId, startMs: sl.startMs, endMs: sl.finishedMs })
        slots.delete(sl.reqId)
      }
    }
    clock += iterMs
  }

  return finalize(segments, finishMs, reqs, busyMs, slotCapacityMs, wastedSlotMs, maxBatchSeen)
}

function finalize(
  segments: Segment[],
  finishMs: number[],
  reqs: RequestSpec[],
  busyMs: number,
  slotCapacityMs: number,
  wastedSlotMs: number,
  maxBatchSeen: number,
): SimResult {
  const totalMs = Math.max(...finishMs, 1)
  const latencies = reqs.map((r, i) => finishMs[i] - r.arrivalMs)
  const sortedLat = [...latencies].sort((a, b) => a - b)
  return {
    segments,
    totalMs,
    throughputReqPerSec: (reqs.length / totalMs) * 1000,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p99LatencyMs: sortedLat[Math.min(sortedLat.length - 1, Math.floor(sortedLat.length * 0.99))],
    wastedSlotPct: (wastedSlotMs / Math.max(slotCapacityMs, 1)) * 100,
    gpuBusyPct: (busyMs / totalMs) * 100,
    maxBatchSeen,
  }
}
