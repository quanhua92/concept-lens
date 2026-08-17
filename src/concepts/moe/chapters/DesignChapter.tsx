import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { fmtBig } from '@/lib/format'
import { V3_MOE, activeFraction } from '../lib'

const EXPERT_COUNTS = [4, 8, 16, 32, 64, 128, 256]

export default function DesignChapter() {
  const [topK, setTopK] = useState(8)
  const [shared, setShared] = useState(1)

  const series: Series[] = useMemo(
    () => [
      {
        name: 'fraction of experts active per token',
        color: '#22d3ee',
        points: EXPERT_COUNTS.map((E) => activeFraction(E, Math.min(topK, E), shared)),
      },
    ],
    [topK, shared],
  )

  const v3Active = activeFraction(V3_MOE.routedExperts, V3_MOE.topK, V3_MOE.sharedExperts)
  const routedPerToken = V3_MOE.topK
  const totalPerToken = routedPerToken + V3_MOE.sharedExperts

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        DeepSeekMoE made two design bets. <strong className="text-zinc-100">Fine-grained</strong>:
        many small experts (256) with more of them active (8) beats few big ones — same active
        parameters, more combinations. <strong className="text-zinc-100">Shared</strong>: one
        expert always on, handling the common knowledge every token needs, so routed experts don’t
        waste capacity relearning it.
      </p>

      <Formula caption="V3's MoE layers: 1 shared (always) + top-8 of 256 routed. 9 of 257 expert slots active per token per layer — 3.5% of the layer's expert capacity.">
        active = (K + shared) / (E + shared)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="experts activated per token (K)"
            value={topK}
            min={1}
            max={16}
            onChange={setTopK}
            format={(v) => `${v}`}
            hint="More active experts = more compute per token, smoother routing, less sparsity."
          />
          <Slider
            label="shared experts (always on)"
            value={shared}
            min={0}
            max={4}
            onChange={setShared}
            format={(v) => `${v}`}
            hint="Capacity reserved for universal knowledge."
          />
        </div>

        <div className="mt-6">
          <LineChart
            series={series}
            xMax={EXPERTS_COUNTS_MAX}
            xTickLabels={EXPERT_COUNTS.map(String)}
            xLabel="total routed experts E"
            yLabel="active fraction"
            height={220}
          />
          <p className="mt-2 font-mono text-xs text-mute">
            DeepSeek-V3 sits here: 256 experts, K=8, 1 shared →{' '}
            <span className="text-accent">{(v3Active * 100).toFixed(1)}%</span> active
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat label="total params" value={fmtBig(V3_MOE.totalParams)} sub="all experts on disk" />
          <Stat label="active per token" value={fmtBig(V3_MOE.activeParams)} tone="good" sub="what computes" />
          <Stat label="experts active/layer" value={`${totalPerToken} / 257`} sub={`${routedPerToken} routed + ${V3_MOE.sharedExperts} shared`} />
          <Stat label="MoE layers" value={`${V3_MOE.moeLayers} + ${V3_MOE.denseLayers} dense`} sub="first 3 layers stay dense" />
        </div>
      </div>

      <Callout variant="idea">
        The 671B/37B gap is the whole MoE pitch in two numbers: capacity scales with{' '}
        <em>all</em> experts (knowledge), compute scales with <em>active</em> experts (speed).
        Fine-grained segmentation means the active 9 are small and specialized rather than big and
        general — more distinct mixtures per token.
      </Callout>
      <Callout variant="note">
        V3 constants from the technical report: 61 layers (3 dense + 58 MoE), 256 routed + 1
        shared expert, top-8, expert intermediate size 2048 vs dense-layer 18432, 671B total, 37B
        active. The curve is computed from the (K+shared)/(E+shared) identity.
      </Callout>
    </div>
  )
}

const EXPERTS_COUNTS_MAX = EXPERT_COUNTS.length - 1

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
