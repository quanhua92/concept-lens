import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { bottleneckExperiment, sampleLatentFlow } from '../lib'
import { fmt } from '@/lib/utils'

export default function MlaChapter() {
  const exp = useMemo(() => bottleneckExperiment(16, 16, 5), [])
  const [seed] = useState(3)
  const flow = useMemo(() => sampleLatentFlow(seed), [seed])
  const [latentWidth, setLatentWidth] = useState(4)

  const series: Series[] = [
    { name: 'reconstruction error (random bottleneck)', color: '#22d3ee', points: exp.relError },
  ]

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        GQA shares heads; MLA (DeepSeek-V2/V3) asks a sharper question:{' '}
        <em>do we even need to cache K and V as-is?</em> Instead, cache a small{' '}
        <strong className="text-zinc-100">latent</strong> — a compressed summary of the token — and
        reconstruct each head’s K and V from it on the fly. The cache shrinks to the latent width,
        regardless of how many heads exist.
      </p>

      <Formula caption="DeepSeek-V3: cache only c_KV (512 dims) + the RoPE part k_R (64 dims) = 576 elements per token per layer. Full MHA would store 2 × 128 heads × 128 = 32,768 — MLA is ~57× smaller.">
        c<sub>t</sub> = W<sup>DQ</sup>x<sub>t</sub> ∈ ℝ⁵¹²&emsp;k<sub>t</sub><sup>R</sup> = RoPE(W<sup>KR</sup>x<sub>t</sub>) ∈ ℝ⁶⁴
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <p className="mb-4 text-xs text-dim">the compression pipeline (toy dims: 16 → {latentWidth} → head)</p>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <FlowBox label="x_t" sub="16 dims" width={120} color="#71717a" />
          <Arrow />
          <FlowBox label={`W^DQ · x_t`} sub={`↓ latent c_t (${latentWidth})`} width={100} color="#22d3ee" highlight />
          <Arrow />
          <FlowBox label="cache" sub="c_t + k_R only" width={100} color="#f59e0b" highlight />
          <Arrow />
          <FlowBox label="W^UK, W^UV" sub="reconstruct K,V per head" width={130} color="#34d399" />
        </div>

        <div className="mt-5">
          <Slider
            label="latent width (rank of the bottleneck)"
            value={latentWidth}
            min={1}
            max={16}
            onChange={setLatentWidth}
            format={(v) => `${v}`}
            hint="Wider latent = more information survives compression (and a bigger cache)."
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs text-dim">
              measured: relative reconstruction error of a random {`16→r→16`} bottleneck (200
              samples, computed live)
            </p>
            <LineChart
              series={series}
              xMax={exp.ranks.length - 1}
              xTickLabels={exp.ranks.map(String)}
              xLabel="latent width r"
              yLabel="‖x − x̂‖ / ‖x‖"
              height={200}
            />
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-mute">
            <p>
              The curve follows theory: a random rank-r bottleneck keeps r/d of the variance
              (error = √(1−r/d)) — at rank 4 of 16, error 0.87; at rank 16, exact. Most of the{' '}
              <em>energy</em> is cheap to keep; the hard part is keeping what attention actually
              uses.
            </p>
            <p>
              Training does far better than random: the learned W<sup>DQ</sup> picks the{' '}
              <em>useful</em> subspace, which is why DeepSeek found 512 of 7,168 dims (7%) enough
              to preserve attention quality.
            </p>
            <p className="font-mono text-xs text-dim">
              toy flow (seed 3): ‖x‖=8-ish → ‖c‖={fmt(Math.sqrt(flow.latent.reduce((s, v) => s + v * v, 0)))} at rank 4
            </p>
          </div>
        </div>
      </div>

      <Callout variant="idea">
        The RoPE split is the subtle part: RoPE mixes <em>position</em> into keys with rotations,
        which don’t commute with the low-rank reconstruction — so the position-carrying part
        (64 dims) is cached <em>separately</em> from the content latent (512). Decoupled RoPE is a
        constraint born from making absorption work.
      </Callout>
      <Callout variant="note">
        At inference, W<sup>UK</sup>/W<sup>UV</sup> are never materialized — they get absorbed into
        W<sup>UQ</sup> and W<sub>O</sub> (matrix associativity: (W<sup>UK</sup>)ᵀq can be computed
        as q·W<sup>UK</sup> against the latent directly). Cache numbers here are DeepSeek-V3
        published dims; the bottleneck error curve is computed in-browser.
      </Callout>
    </div>
  )
}

function FlowBox({ label, sub, width, color, highlight }: { label: string; sub: string; width: number; color: string; highlight?: boolean }) {
  return (
    <motion.div
      layout
      className="flex flex-col items-center justify-center rounded-xl border px-3 py-3 text-center"
      style={{
        minWidth: width,
        borderColor: highlight ? color : '#26262e',
        backgroundColor: highlight ? `${color}14` : '#1a1a21',
      }}
    >
      <span className="font-mono text-xs" style={{ color }}>
        {label}
      </span>
      <span className="mt-0.5 text-[10px] text-dim">{sub}</span>
    </motion.div>
  )
}

function Arrow() {
  return (
    <motion.span layout aria-hidden className="self-center text-dim">
      →
    </motion.span>
  )
}
