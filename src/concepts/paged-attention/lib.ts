import { mulberry32 } from '@/lib/math'

export const BLOCK_SIZE = 16

export interface SeqSpec {
  id: number
  maxCtx: number
  actualLen: number
}

export function generateSeqs(seed: number, n: number, maxCtx: number): SeqSpec[] {
  const rng = mulberry32(seed)
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    maxCtx,
    actualLen: 64 + Math.floor(rng() * (maxCtx - 64)),
  }))
}

export interface ContigResult {
  reservedBlocks: number
  usedBlocks: number
  wastedBlocks: number
  wastedPct: number
  concurrentFit: number
}

export function contiguousStats(seqs: SeqSpec[], poolBlocks: number): ContigResult {
  const reserved = seqs.reduce((s, q) => s + Math.ceil(q.maxCtx / BLOCK_SIZE), 0)
  const used = seqs.reduce((s, q) => s + Math.ceil(q.actualLen / BLOCK_SIZE), 0)
  const perSeqReserved = Math.ceil((seqs[0]?.maxCtx ?? 0) / BLOCK_SIZE)
  return {
    reservedBlocks: reserved,
    usedBlocks: used,
    wastedBlocks: reserved - used,
    wastedPct: ((reserved - used) / Math.max(reserved, 1)) * 100,
    concurrentFit: Math.floor(poolBlocks / Math.max(perSeqReserved, 1)),
  }
}

export interface PagedResult {
  usedBlocks: number
  partialWasteTokens: number
  wastedPct: number
  concurrentFit: number
}

export function pagedStats(seqs: SeqSpec[], poolBlocks: number): PagedResult {
  const used = seqs.reduce((s, q) => s + Math.ceil(q.actualLen / BLOCK_SIZE), 0)
  const partial = seqs.reduce((s, q) => s + (BLOCK_SIZE - (q.actualLen % BLOCK_SIZE || BLOCK_SIZE)), 0)
  const avgBlocksPerSeq = used / Math.max(seqs.length, 1)
  return {
    usedBlocks: used,
    partialWasteTokens: partial,
    wastedPct: (partial / (used * BLOCK_SIZE)) * 100,
    concurrentFit: Math.floor(poolBlocks / Math.max(avgBlocksPerSeq, 1)),
  }
}

export interface PagedAllocationStep {
  seqId: number
  tokensSoFar: number
  blockIndex: number
  isNew: boolean
}

export function buildPagedTimeline(seqs: SeqSpec[], poolBlocks: number): {
  steps: PagedAllocationStep[]
  table: Map<number, number[]>
  evicted: number[]
} {
  const steps: PagedAllocationStep[] = []
  const table = new Map<number, number[]>()
  seqs.forEach((q) => table.set(q.id, []))
  const free = Array.from({ length: poolBlocks }, (_, i) => poolBlocks - 1 - i)
  const evicted: number[] = []
  let nextFree = 0
  let progress = seqs.map(() => 0)
  let any = true
  while (any) {
    any = false
    for (const q of seqs) {
      if (progress[q.id] >= q.actualLen) continue
      any = true
      progress[q.id] += 1
      const t = table.get(q.id)!
      const needBlock = t.length === 0 || progress[q.id] > t.length * BLOCK_SIZE
      if (needBlock) {
        if (nextFree < free.length) {
          t.push(free[nextFree])
          steps.push({ seqId: q.id, tokensSoFar: progress[q.id], blockIndex: free[nextFree], isNew: true })
          nextFree++
        } else {
          evicted.push(q.id)
          progress[q.id] = q.actualLen
        }
      }
    }
  }
  return { steps, table, evicted }
}

export const V3_24GB = {
  gpuBytes: 24 * 1024 ** 3,
  weightsBytes: 15.24 * 1024 ** 3,
  kvBytesPerToken: 2 * 28 * 4 * 128 * 2,
}

export function poolBlocksFor24GB(): number {
  return Math.floor((V3_24GB.gpuBytes - V3_24GB.weightsBytes) / (V3_24GB.kvBytesPerToken * BLOCK_SIZE))
}
