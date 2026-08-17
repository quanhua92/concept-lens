import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { fmt } from '@/lib/utils'
import { BLOCK_SIZE, contiguousStats, generateSeqs, pagedStats, poolBlocksFor24GB } from '../lib'

type Mode = 'contiguous' | 'paged'

export default function PagingChapter() {
  const pool = useMemo(poolBlocksFor24GB, [])
  const [mode, setMode] = useState<Mode>('contiguous')
  const [maxCtx, setMaxCtx] = useState(8192)
  const [nSeqs, setNSecs] = useState(12)

  const seqs = useMemo(() => generateSeqs(7, 16, maxCtx), [maxCtx])
  const active = seqs.slice(0, Math.min(nSeqs, seqs.length))
  const contig = useMemo(() => contiguousStats(active, pool), [active, pool])
  const paged = useMemo(() => pagedStats(active, pool), [active, pool])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The KV cache needs a home. The naive answer — reserve each sequence a{' '}
        <em>contiguous</em> buffer for its maximum context — wastes more than half the memory:
        most sequences never reach the max. <strong className="text-zinc-100">PagedAttention</strong>{' '}
        borrows from operating systems: split the cache into fixed{' '}
        {BLOCK_SIZE}-token blocks, allocate on demand, and map logical to physical blocks with a
        per-sequence <strong className="text-zinc-100">block table</strong>.
      </p>

      <Formula caption="Per sequence: contiguous reserves ceil(max_ctx/B) blocks up front; paged allocates ceil(actual_len/B) as tokens arrive. Waste collapses from 'reserved − used' to an average half-empty final block.">
        table[seq] = [block₁, block₂, …] → scattered physical blocks
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: 'contiguous', label: 'contiguous reservation' },
              { value: 'paged', label: 'paged blocks' },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="allocation mode"
          />
          <p className="font-mono text-xs text-dim">
            pool: {pool.toLocaleString()} blocks ({fmt((pool * BLOCK_SIZE * 57344) / 1024 ** 3, 1)} GB KV) on a 24 GB card
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="max context per sequence"
            value={maxCtx}
            min={1024}
            max={32768}
            step={1024}
            onChange={setMaxCtx}
            format={(v) => `${(v / 1024).toFixed(0)}k`}
            hint="Contiguous must reserve for this; paged never needs to know it."
          />
          <Slider
            label="sequences"
            value={nSeqs}
            min={4}
            max={16}
            onChange={setNSecs}
            format={(v) => `${v}`}
          />
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs text-dim">
            {mode === 'contiguous'
              ? 'reserved vs actually used (seeded lengths) — the gap is unreachable by other sequences'
              : 'blocks actually used (on-demand) — only the final block of each sequence is partial'}
          </p>
          {active.map((q) => {
            const used = Math.ceil(q.actualLen / BLOCK_SIZE)
            const reserved = mode === 'contiguous' ? Math.ceil(q.maxCtx / BLOCK_SIZE) : used
            return (
              <div key={q.id} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right font-mono text-[10px] text-dim">s{q.id}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-panel-2">
                  <motion.div
                    animate={{ width: `${(reserved / Math.max(contig.reservedBlocks, 1)) * 100}%` }}
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ backgroundColor: mode === 'contiguous' ? 'rgba(251,113,133,0.25)' : 'rgba(34,211,238,0.2)' }}
                  />
                  <motion.div
                    animate={{ width: `${(used / Math.max(contig.reservedBlocks, 1)) * 100}%` }}
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ backgroundColor: mode === 'contiguous' ? '#fb7185' : '#22d3ee' }}
                  />
                </div>
                <span className="w-24 shrink-0 font-mono text-[10px] text-dim">
                  {used}/{reserved} blk
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label="cache waste"
            value={mode === 'contiguous' ? `${fmt(contig.wastedPct, 0)}%` : `${fmt(paged.wastedPct, 1)}%`}
            tone={mode === 'contiguous' ? 'bad' : 'good'}
            sub={mode === 'contiguous' ? `${contig.wastedBlocks.toLocaleString()} blocks stranded` : `half-empty last blocks only`}
          />
          <Stat
            label="sequences the GPU can hold"
            value={String(mode === 'contiguous' ? contig.concurrentFit : paged.concurrentFit)}
            tone={mode === 'contiguous' ? 'warn' : 'good'}
            sub={mode === 'contiguous' ? 'reserved at max context' : 'at actual lengths'}
          />
          <Stat
            label="the other mode"
            value={mode === 'contiguous' ? `${paged.concurrentFit} seqs paged` : `${contig.wastedPct.toFixed(0)}% wasted contiguous`}
            sub="same pool, same requests"
          />
        </div>
      </div>

      <Callout variant="idea">
        This is virtual memory, rediscovered for tensors: the logical sequence (positions 0, 1,
        2…) is decoupled from physical placement, so fragmentation stops being a{' '}
        <em>capacity</em> problem and becomes a bookkeeping one — block tables are cheap. vLLM
        measured 2–4× throughput vs contiguous allocators, mostly via larger effective batch.
      </Callout>
      <Callout variant="note">
        Pool math: 24 GB − 15.24 GB weights = 9.76 GB → 10,251 blocks of 16 tokens (Qwen2.5-7B KV
        accounting, FP16). Sequence lengths are seeded uniform(64, max); the copy-on-write sharing
        that beam search gets (identical prefixes share blocks) isn’t modeled — it widens the gap
        further.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-delta' : 'text-bad'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
