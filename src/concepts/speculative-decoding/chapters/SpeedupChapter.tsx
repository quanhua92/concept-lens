import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { expectedTokensPerPass, optimalGamma, speedup } from '../lib'

const GAMMAS = Array.from({ length: 16 }, (_, i) => i + 1)

export default function SpeedupChapter() {
  const [alpha, setAlpha] = useState(0.8)
  const [draftCost, setDraftCost] = useState(0.1)

  const series: Series[] = useMemo(
    () => [
      { name: `wall-clock speedup (c=${draftCost.toFixed(2)})`, color: '#22d3ee', points: GAMMAS.map((g) => speedup(alpha, g, draftCost)) },
      { name: 'tokens per pass (no cost)', color: '#f59e0b', points: GAMMAS.map((g) => expectedTokensPerPass(alpha, g)) },
    ],
    [alpha, draftCost],
  )

  const gOpt = optimalGamma(alpha, draftCost)
  const sOpt = speedup(alpha, gOpt, draftCost)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Acceptance is only half the story — the draft isn’t free. If each drafted token costs a
        fraction <code className="rounded bg-panel-2 px-1 font-mono text-xs text-accent">c</code>{' '}
        of a target step (a 1B draft against a 70B target: c ≈ 0.05), the whole speedup is one
        formula — and it has an interior optimum: draft too far ahead and rejections throw away
        work.
      </p>

      <Formula caption="E[tokens/pass] = (1 − α^(γ+1))/(1 − α), so speedup = E[T] / (1 + cγ). All three knobs interact — computed live below.">
        S(α, γ, c) = (1 − α^(γ+1)) / ((1 − α)(1 + cγ))
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="acceptance rate α"
            value={alpha}
            min={0.3}
            max={0.95}
            step={0.05}
            onChange={setAlpha}
            format={(v) => v.toFixed(2)}
            hint="Draft quality — from a mediocre n-gram-ish draft to a distilled mini-me."
          />
          <Slider
            label="draft cost per token c"
            value={draftCost}
            min={0.02}
            max={0.4}
            step={0.02}
            onChange={setDraftCost}
            format={(v) => v.toFixed(2)}
            hint="0.05 ≈ 1B draft vs 70B target · 0.15 ≈ 7B draft vs 70B · MTP heads push c toward 0 (shared trunk)."
          />
        </div>

        <div className="mt-6">
          <LineChart
            series={series}
            xMax={GAMMAS.length - 1}
            xTickLabels={GAMMAS.map(String)}
            xLabel="draft length γ (tokens per speculation round)"
            yLabel="×"
            height={250}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="optimal γ" value={`${gOpt}`} tone="good" sub={`at α=${alpha.toFixed(2)}, c=${draftCost.toFixed(2)}`} />
          <Stat label="best speedup" value={`${fmt(sOpt, 2)}×`} tone="good" sub="verify batch amortizes the weight-read" />
          <Stat
            label="speedup at γ=16"
            value={`${fmt(speedup(alpha, 16, draftCost), 2)}×`}
            tone={speedup(alpha, 16, draftCost) < sOpt * 0.9 ? 'bad' : 'warn'}
            sub={speedup(alpha, 16, draftCost) < sOpt * 0.9 ? 'over-drafting: rejections eat the gains' : 'still climbing'}
          />
        </div>
      </div>

      <Callout variant="idea">
        The curve peaks because E[T] saturates at 1/(1−α) while the cost 1+cγ grows linearly —
        beyond the peak you pay for tokens you mostly reject. This is why real engines adapt γ on
        the fly from observed acceptance, and why MTP (architecture track) is attractive: its
        draft shares the trunk, driving c toward zero and the optimum toward large γ.
      </Callout>
      <Callout variant="note">
        E[T] is the exact expectation under i.i.d. acceptance; the previous chapter verified the
        empirical loop agrees. Wall-clock assumes bandwidth-bound decode (draft cost ∝ params) —
        the same first-order model used throughout the serving track.
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
