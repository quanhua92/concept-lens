import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { fmt } from '@/lib/utils'
import { PAIRS, dpoGrad, dpoLoss, pairMargin } from '../lib'

const M_LO = -6
const M_HI = 6

export default function DpoChapter() {
  const [beta, setBeta] = useState(0.3)

  const curve = useMemo(() => {
    const pts: { m: number; loss: number }[] = []
    for (let i = 0; i <= 80; i++) {
      const m = M_LO + ((M_HI - M_LO) * i) / 80
      pts.push({ m, loss: dpoLoss(m, beta) })
    }
    return pts
  }, [beta])

  const W = 560
  const H = 280
  const pad = { l: 46, r: 16, t: 16, b: 36 }
  const sx = (m: number) => pad.l + ((m - M_LO) / (M_HI - M_LO)) * (W - pad.l - pad.r)
  const lossMax = dpoLoss(M_LO, beta)
  const sy = (v: number) => pad.t + (1 - v / lossMax) * (H - pad.t - pad.b)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        RLHF’s original recipe (learn a reward model, then PPO) is heavy machinery. DPO’s insight:
        the whole pipeline collapses into a{' '}
        <strong className="text-zinc-100">classification loss on preference pairs</strong>. For
        each (chosen y<sub>w</sub>, rejected y<sub>l</sub>), the model gets one margin — how much
        more likely it makes the chosen answer than the rejected one, relative to the reference
        model — and the loss is a logistic curve on that margin.
      </p>

      <Formula caption="DPO loss. The margin m = log[π(y_w)/π_ref(y_w)] − log[π(y_l)/π_ref(y_l)] is the implicit reward gap; β controls how hard the loss pushes versus how far the policy may drift.">
        L = −log σ(β·m)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="max-w-sm">
          <Slider
            label="β (deviation penalty)"
            value={beta}
            min={0.05}
            max={1}
            step={0.05}
            onChange={setBeta}
            format={(v) => v.toFixed(2)}
            hint="Small β: gentle slope, tolerates big drift. Large β: sharp cliff, small margins must suffice."
          />
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="DPO loss vs margin">
          <line x1={pad.l} x2={W - pad.r} y1={sy(0)} y2={sy(0)} stroke="#26262e" />
          <line x1={sx(0)} x2={sx(0)} y1={pad.t} y2={H - pad.b} stroke="#26262e" />
          {[-6, -3, 0, 3, 6].map((t) => (
            <text key={t} x={sx(t)} y={H - pad.b + 16} textAnchor="middle" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          ))}
          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#a1a1aa">
            margin m (chosen vs rejected, in log-ratio units)
          </text>
          <text x={10} y={pad.t + 8} fontSize="10" fill="#a1a1aa">
            loss
          </text>
          <path
            d={curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.m).toFixed(1)} ${sy(p.loss).toFixed(1)}`).join(' ')}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
          />
          {PAIRS.map((p) => {
            const m = pairMargin(p)
            const loss = dpoLoss(m, beta)
            const grad = dpoGrad(m, beta)
            return (
              <motion.g key={p.name} animate={{ x: 0, y: 0 }}>
                <circle cx={sx(m)} cy={sy(loss)} r="6" fill={m > 0 ? '#34d399' : '#fb7185'} stroke="#0a0a0c" strokeWidth="2" />
                <title>{`${p.name}: margin ${m.toFixed(1)}, loss ${loss.toFixed(2)}, gradient ${grad.toFixed(3)}`}</title>
              </motion.g>
            )
          })}
        </svg>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PAIRS.map((p) => {
            const m = pairMargin(p)
            return (
              <div key={p.name} className="rounded-xl border border-line bg-panel-2 px-4 py-3">
                <p className="text-[11px] tracking-wide text-dim uppercase">{p.name}</p>
                <p className="mt-1 font-mono text-sm text-zinc-100">
                  m={fmt(m, 1)} · L={fmt(dpoLoss(m, beta), 2)} · ∇={fmt(dpoGrad(m, beta), 3)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-dim">
                  {m > 2
                    ? 'Solved pair: gradient ≈ 0, the loss has forgotten it.'
                    : m > 0
                      ? 'Right side of zero: mild pressure upward.'
                      : 'The model currently prefers the rejected answer — largest gradient.'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <Callout variant="idea">
        The logistic does automatic curriculum: badly-wrong pairs (m &lt; 0) dominate the gradient;
        solved pairs vanish. And β is a <em>social</em> knob — large enough and the model can’t
        drift far from the reference just to win preferences (the reward-hacking leash).
      </Callout>
      <Callout variant="note">
        Loss and gradient are the exact DPO formulas evaluated live. The three pairs are archetypes
        with fixed margins (no training loop on this page — the next chapter does the live
        training). Margins are in log-ratio units: m=0 means the policy likes both answers
        equally, relative to reference.
      </Callout>
    </div>
  )
}
