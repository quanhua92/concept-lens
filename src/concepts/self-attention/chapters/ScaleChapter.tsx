import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { runScaleExperiment } from '../lib'

type Metric = 'std' | 'maxprob'

export default function ScaleChapter() {
  const exp = useMemo(() => runScaleExperiment(7, 600), [])
  const [metric, setMetric] = useState<Metric>('std')

  const series: Series[] =
    metric === 'std'
      ? [
          { name: 'std of raw q·k', color: '#fb7185', points: exp.rawStd },
          { name: 'std of q·k / √dₖ', color: '#22d3ee', points: exp.scaledStd },
        ]
      : [
          { name: 'softmax peak (raw)', color: '#fb7185', points: exp.rawMaxProb },
          { name: 'softmax peak (scaled)', color: '#22d3ee', points: exp.scaledMaxProb },
        ]

  const d128 = exp.dks.indexOf(128)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Here’s a puzzle the original transformer paper had to solve. A dot product of two random
        unit-variance vectors adds up d<sub>k</sub> independent terms — so its variance{' '}
        <em>is</em> d<sub>k</sub>. At d<sub>k</sub> = 128, raw scores routinely hit ±30. Softmax on
        scores like that saturates: one winner at probability ≈ 1, everything else at ≈ 0 — and
        gradients die. The fix is one division.
      </p>

      <Formula caption="Vaswani et al. (2017), footnote 4: dot products grow with dₖ, 'pushing the softmax function into regions where it has extremely small gradients.' Dividing by √dₖ restores variance ≈ 1.">
        S[i][j] = (qᵢ · kⱼ) / √dₖ
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-dim">
            empirical experiment — 600 seeded random q·k pairs per dₖ, computed live
          </p>
          <SegmentedControl
            options={[
              { value: 'std', label: 'score spread' },
              { value: 'maxprob', label: 'softmax saturation' },
            ]}
            value={metric}
            onChange={setMetric}
            ariaLabel="experiment metric"
          />
        </div>

        <LineChart
          series={series}
          xMax={exp.dks.length - 1}
          xTickLabels={exp.dks.map(String)}
          xLabel="dₖ"
          yLabel={metric === 'std' ? 'std of scores' : 'max softmax prob'}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label={`std @ dₖ=128 · raw`} value={exp.rawStd[d128].toFixed(1)} tone="bad" sub="≈ √128 = 11.3" />
          <Stat label="std @ dₖ=128 · scaled" value={exp.scaledStd[d128].toFixed(2)} tone="good" sub="≈ 1 at any dₖ" />
          <Stat
            label="peak prob @ 128 · raw"
            value={exp.rawMaxProb[d128].toFixed(3)}
            tone="bad"
            sub="one token takes everything"
          />
        </div>
      </div>

      <Callout variant="idea">
        The scale factor is not a heuristic — it’s an exact variance correction. Sum of dₖ
        unit-variance products has variance dₖ; dividing by √dₖ gives variance 1 at{' '}
        <em>every</em> width. That keeps softmax in its responsive zone regardless of how big the
        model gets.
      </Callout>
      <Callout variant="note">
        The saturation numbers are worst-case (random vectors, no learned structure). Real trained
        keys and queries correlate, but the variance argument still bounds the scale — which is why
        every transformer since 2017 keeps the 1/√dₖ.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : 'text-bad'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[11px] text-dim">{sub}</p> : null}
    </div>
  )
}
