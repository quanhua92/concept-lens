import { useMemo } from 'react'
import { Callout, Formula } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { rankExperiment } from '../lib'

export default function LowRankChapter() {
  const { exp } = useMemo(() => rankExperiment(11), [])

  const series: Series[] = [
    { name: 'structured update (low-rank + noise)', color: '#22d3ee', points: exp.structuredErr },
    { name: 'generic random matrix', color: '#fb7185', points: exp.genericErr },
  ]

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        LoRA begins as an empirical observation about fine-tuning: when you compare a fine-tuned
        model to its base, the difference ΔW has strongly decaying singular values — the update{' '}
        <em>lives in a low-dimensional subspace</em>. So why train d×k numbers when rank-r (two thin
        matrices) can express the change? The experiment below runs real SVD (power iteration) on
        two matrices and truncates optimally.
      </p>

      <Formula caption="Optimal rank-r truncation keeps the top r singular values. For a structured update the error collapses by rank 5–8; for a generic random matrix it barely moves.">
        ΔW ≈ B·A,&emsp;B ∈ ℝ^(d×r), A ∈ ℝ^(r×k)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <LineChart
          series={series}
          xMax={exp.ranks.length - 1}
          xTickLabels={exp.ranks.map(String)}
          xLabel="rank r used in reconstruction"
          yLabel="relative Frobenius error"
        />
        <p className="mt-2 font-mono text-xs text-mute">
          at rank 5: structured {exp.structuredErr[3].toFixed(3)} vs generic{' '}
          {exp.genericErr[3].toFixed(3)} — same budget, different worlds
        </p>
      </div>

      <Callout variant="idea">
        The bet LoRA makes: <em>adaptation is intrinsically low-rank</em> even when the base weights
        are not. A base model needs the full rank to encode everything it knows; a fine-tune only
        nudges behavior along a few directions — a style, a domain, a task.
      </Callout>
      <Callout variant="note">
        The “structured” matrix here is constructed rank-5 plus 6% noise (recovered exactly at
        rank 5, verified: error ~1e-16 before noise); the generic one is uniform Gaussian. Real
        fine-tune deltas aren’t constructed — the empirical finding (LoRA paper; intrinsic rank
        measurements) is that their spectra look like the cyan curve, not the rose one. The SVD is
        computed in-browser by power iteration with deflation.
      </Callout>
    </div>
  )
}
