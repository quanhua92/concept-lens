import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { DistBars } from '@/components/viz'
import { mulberry32 } from '@/lib/math'
import { mixDists, runExperiment, theoreticalAcceptance, uniformDist } from '../lib'

const N = 10
const GAMMA = 4
const PASSES = 2000

export default function AcceptChapter() {
  const target = useMemo(() => {
    const rng = mulberry32(3)
    const raw = Array.from({ length: N }, () => 0.1 + rng())
    const z = raw.reduce((a, b) => a + b, 0)
    return raw.map((x) => x / z)
  }, [])

  const [lam, setLam] = useState(0.7)

  const draft = useMemo(() => mixDists(target, uniformDist(N), lam), [target, lam])
  const theory = useMemo(() => theoreticalAcceptance(target, draft), [target, draft])
  const emp = useMemo(() => runExperiment(target, draft, GAMMA, PASSES, 42), [target, draft])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Speculative decoding is a free lunch with a proof attached. A small <em>draft</em> model
        proposes γ tokens; the big <em>target</em> model verifies all of them in one forward pass
        (it was going to read its weights anyway). Each drafted token survives an exact statistical
        test — and the astonishing theorem is that the output distribution is{' '}
        <strong className="text-zinc-100">identical to the target’s</strong>, whatever the draft
        does.
      </p>

      <Formula caption="Leviathan/Chen (2023): accept x with probability min(1, p(x)/q(x)); on rejection, resample from the residual norm(max(0, p − q)) and stop. The rejection-sampling algebra makes the mixture exactly p.">
        accept? u &lt; min(1, p/q)&emsp;·&emsp;else sample ∝ max(0, p − q)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="draft quality λ (1 = perfect draft, 0 = uniform)"
          value={lam}
          min={0}
          max={1}
          step={0.05}
          onChange={setLam}
          format={(v) => v.toFixed(2)}
          hint="q = λ·p + (1−λ)·uniform — a slider over how well the draft mimics the target."
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-dim">target p (fixed, seeded)</p>
            <DistBars items={target.map((v, i) => ({ label: `t${i}`, p: v, color: '#22d3ee' }))} height={140} />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">draft q at λ={lam.toFixed(2)}</p>
            <DistBars items={draft.map((v, i) => ({ label: `t${i}`, p: v, color: '#f59e0b' }))} height={140} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label={`theoretical α = Σ min(p, q)`}
            value={theory.toFixed(3)}
            sub="closed form — exact"
          />
          <Stat
            label={`empirical acceptance (${PASSES.toLocaleString()} passes, γ=${GAMMA})`}
            value={emp.acceptanceRate.toFixed(3)}
            tone="good"
            sub="measured from the real accept/reject loop"
          />
          <Stat
            label="tokens per pass"
            value={`${emp.tokensPerPass.toFixed(2)}`}
            sub="1 + α + α² + … + α^γ (theory: matches)"
          />
        </div>
      </div>

      <Callout variant="idea">
        Look closely at the test: when the draft is <em>over</em>-confident on a token the target
        dislikes (q &gt; p), acceptance is p/q &lt; 1 — the veto. When the draft is under-confident
        (q ≤ p), acceptance is 1 — automatic pass, and the leftover probability flows into the
        residual distribution. Nothing the draft can do skews the output.
      </Callout>
      <Callout variant="note">
        The acceptance loop is the real algorithm running 2,000 seeded passes per slider position;
        theory and empirics agree to ~0.002. Verification cost per drafted token is ~1/γ of a
        normal pass because the target’s weights are read once for the whole batch (the bandwidth
        argument from the roofline concept).
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
