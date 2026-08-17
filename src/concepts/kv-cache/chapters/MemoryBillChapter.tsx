import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { fmtBytes } from '@/lib/format'
import { QWEN7B, QWEN7B_MHA, kvBytesPerToken, kvTotalBytes } from '../lib'

const GPU_BYTES = 24 * 1024 ** 3
const WEIGHTS_BYTES = 14.2 * 1024 ** 3
const POINTS = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072]

export default function MemoryBillChapter() {
  const [context, setContext] = useState(8192)

  const series: Series[] = useMemo(
    () => [
      {
        name: 'MHA (28 kv-heads)',
        color: '#fb7185',
        points: POINTS.map((c) => kvTotalBytes(QWEN7B_MHA, c) / 1024 ** 3),
      },
      {
        name: 'GQA (4 kv-heads) — as shipped',
        color: '#22d3ee',
        points: POINTS.map((c) => kvTotalBytes(QWEN7B, c) / 1024 ** 3),
      },
    ],
    [],
  )

  const kvNow = kvTotalBytes(QWEN7B, context)
  const budget = GPU_BYTES - WEIGHTS_BYTES
  const seqsFit = Math.max(0, Math.floor(budget / kvNow))

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The cache trades compute for memory — linear in context length, per sequence. On a 24 GB
        GPU with 14.2 GB of FP16 weights, the KV cache gets whatever is left. The chart below is
        computed from Qwen2.5-7B’s real config; move the slider and watch your concurrency budget
        evaporate.
      </p>

      <Formula caption="Per sequence: 2 (K and V) × layers × kv_heads × head_dim × 2 bytes × context. GQA’s 4 KV heads (vs 28) are what keeps long context feasible.">
        KV = 2 · L · H_kv · d_h · bytes · ctx
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="context length per sequence"
          value={context}
          min={512}
          max={131072}
          step={512}
          onChange={setContext}
          format={(v) => v.toLocaleString()}
        />

        <div className="mt-4">
          <LineChart
            series={series}
            xMax={POINTS.length - 1}
            xTickLabels={POINTS.map((p) => (p >= 1024 ? `${p / 1024}k` : String(p)))}
            xLabel="context"
            yLabel="KV cache (GB)"
          />
          <p className="mt-2 font-mono text-xs text-mute">
            at {context.toLocaleString()}: MHA {fmtBytes(kvTotalBytes(QWEN7B_MHA, context))} vs GQA{' '}
            <span className="text-accent">{fmtBytes(kvNow)}</span> — 7× smaller
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="KV per token" value={fmtBytes(kvBytesPerToken(QWEN7B))} sub="GQA, FP16" />
          <Stat label="budget after weights" value={fmtBytes(budget)} sub="24 GB GPU − 14.2 GB weights" />
          <Stat
            label={`sequences that fit @ ${context >= 1024 ? `${context / 1024}k` : context}`}
            value={String(seqsFit)}
            tone={seqsFit === 0 ? 'bad' : seqsFit < 8 ? 'warn' : 'good'}
            sub={seqsFit === 0 ? 'cache alone exceeds the GPU' : `each adds ${fmtBytes(kvNow)}`}
          />
        </div>
      </div>

      <Callout variant="idea">
        KV memory is the hard constraint on both context length and concurrency — which is why the
        next two ideas exist: share heads across the model (GQA — already active in Qwen), and
        compress K/V into a small latent (MLA, DeepSeek’s answer). Serving track adds the third
        fix: page the cache like virtual memory (PagedAttention).
      </Callout>
      <Callout variant="note">
        Chart values assume FP16 KV. Many engines store the cache in FP8 or INT4 (quantization
        concept) halving or quartering every number here. 24 GB / 14.2 GB / 28L·4H·128d are cited
        constants; the curve, budget, and sequence counts are computed from them.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-delta' : tone === 'good' ? 'text-good' : 'text-zinc-100'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
