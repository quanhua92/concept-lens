import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { GPUS, batchTokensPerSec, decodeTokensPerSec } from '../lib'
import { fmt } from '@/lib/utils'

const BATCHES = [1, 2, 4, 8, 16, 32, 64, 128]

export default function TpsChapter() {
  const [gpuIdx, setGpuIdx] = useState(2)
  const [context, setContext] = useState(4096)
  const gpu = GPUS[gpuIdx]

  const perSeq: Series[] = useMemo(
    () => [{ name: 'per-sequence tok/s', color: '#fb7185', points: BATCHES.map((b) => decodeTokensPerSec(b, context, gpu)) }],
    [context, gpu],
  )
  const total: Series[] = useMemo(
    () => [{ name: 'total tok/s (all sequences)', color: '#22d3ee', points: BATCHES.map((b) => batchTokensPerSec(b, context, gpu)) }],
    [context, gpu],
  )

  const single = decodeTokensPerSec(1, context, gpu)
  const at64 = batchTokensPerSec(64, context, gpu)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        If decode is bandwidth-bound (it is — last chapter), then its speed is one division:{' '}
        <strong className="text-zinc-100">tokens/second = bandwidth ÷ bytes-read-per-token</strong>.
        No amount of GPU compute helps until the bytes shrink. Watch what batching and context do
        to that division — live, on real specs.
      </p>

      <Formula caption="Each decode step reads all weights (15.2 GB) plus each sequence's KV cache. Batch B: same weight read serves B sequences — the denominator amortizes.">
        tok/s ≈ BW / (W_bytes + B · ctx · KV_bytes/token)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={GPUS.map((g, i) => ({ value: String(i), label: g.name }))}
            value={String(gpuIdx)}
            onChange={(v) => setGpuIdx(Number(v))}
            ariaLabel="gpu"
          />
        </div>

        <div className="max-w-md">
          <Slider
            label="context length per sequence"
            value={context}
            min={512}
            max={32768}
            step={512}
            onChange={setContext}
            format={(v) => `${(v / 1024).toFixed(0)}k`}
            hint="Longer contexts grow the KV term — the weight read stays fixed."
          />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-dim">per-sequence speed falls with batch</p>
            <LineChart series={perSeq} xMax={BATCHES.length - 1} xTickLabels={BATCHES.map(String)} xLabel="batch size" yLabel="tok/s per seq" height={200} />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">total throughput rises until KV dominates</p>
            <LineChart series={total} xMax={BATCHES.length - 1} xTickLabels={BATCHES.map(String)} xLabel="batch size" yLabel="total tok/s" height={200} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label={`batch 1 @ ${(context / 1024).toFixed(0)}k ctx`} value={`${fmt(single, 0)} tok/s`} sub="latency-bound: whole GPU for one user" />
          <Stat label="batch 64 total" value={`${fmt(at64, 0)} tok/s`} tone="good" sub={`${fmt(at64 / single, 1)}× the batch-1 throughput`} />
          <Stat label="per-seq at batch 64" value={`${fmt(decodeTokensPerSec(64, context, gpu), 1)} tok/s`} tone="warn" sub="each user is slower — the batching trade" />
        </div>
      </div>

      <Callout variant="idea">
        Batching is a <em>conversion</em>: it spends per-user latency to buy total throughput,
        because 64 sequences share one weight-read. The KV term eventually caps the win — at long
        context it outgrows the weights themselves, which is why serving engines fight for every
        KV byte (GQA, paged allocation, cache quantization).
      </Callout>
      <Callout variant="note">
        This is the idealized bandwidth-only model (perfect overlap, no kernel overhead, hits
        ~70-85% of measured vLLM numbers). Its value is the <em>shape</em>: everything after this
        — PagedAttention, quantization, speculation — is an attack on one of the two terms in that
        division.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-delta' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
