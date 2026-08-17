import { useMemo, useState } from 'react'
import { Button, Callout, Formula, Slider } from '@/components/ui'
import { DistBars, LineChart, type Series } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { runGrpoBandit } from '../lib'

const ACTIONS = ['A', 'B', 'C', 'D']
const REWARDS = [-1, 0.2, 0.6, 1.4]

export default function GrpoChapter() {
  const [betaKl, setBetaKl] = useState(0.05)
  const [groupSize, setGroupSize] = useState(8)
  const [steps, setSteps] = useState(80)
  const [seed, setSeed] = useState(5)

  const run = useMemo(
    () => runGrpoBandit({ rewards: REWARDS, groupSize, steps, lr: 0.5, betaKl, seed, noise: 0.3 }),
    [groupSize, steps, betaKl, seed],
  )

  const rewardSeries: Series[] = [
    { name: 'mean reward under policy', color: '#34d399', points: run.meanReward },
  ]
  const klSeries: Series[] = [
    { name: 'KL(policy ‖ reference)', color: '#f59e0b', points: run.klHistory },
  ]

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        GRPO trains reasoning models without a critic network. For each prompt, sample a{' '}
        <strong className="text-zinc-100">group</strong> of G answers, score them, and let the
        group’s own statistics replace the value function: advantage = (reward − group mean) ÷
        group std. Better-than-average answers get pushed up; worse-than-average, down — no reward
        model, no critic. The KL penalty to a reference policy is the leash. This page runs the
        real update loop on a 4-armed bandit, live.
      </p>

      <Formula caption="GRPO advantage (per group): A_i = (r_i − mean(r)) / std(r). Policy gradient on sampled actions, KL-regularized toward the reference.">
        A<sub>i</sub> = (r<sub>i</sub> − μ<sub>group</sub>) / σ<sub>group</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <Slider
            label="group size G"
            value={groupSize}
            min={2}
            max={16}
            onChange={setGroupSize}
            format={(v) => `${v}`}
            hint="More samples = better mean/std estimates = lower-variance advantages."
          />
          <Slider
            label="KL penalty β"
            value={betaKl}
            min={0}
            max={0.5}
            step={0.01}
            onChange={setBetaKl}
            format={(v) => v.toFixed(2)}
            hint="0: free optimization. Higher: the policy may drift less from the reference."
          />
          <div className="flex items-end gap-2">
            <Button onClick={() => setSteps((s) => Math.min(s + 40, 400))}>+40 steps</Button>
            <Button onClick={() => setSeed((s) => s + 1)}>Reroll</Button>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-dim">
              policy over actions (reference → after {steps} GRPO steps)
            </p>
            <DistBars
              items={run.finalProbs.map((p, i) => ({
                label: `${ACTIONS[i]} (r=${REWARDS[i]})`,
                p,
                color: REWARDS[i] === Math.max(...REWARDS) ? '#34d399' : '#22d3ee',
              }))}
              height={150}
              labelAngle={false}
            />
            <p className="mt-2 font-mono text-[11px] text-dim">
              reference: {run.refProbs.map((p) => p.toFixed(2)).join(' ')}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">learning curves</p>
            <LineChart series={rewardSeries} xLabel="step" yLabel="reward" height={130} />
            <LineChart series={klSeries} xLabel="step" yLabel="KL" height={130} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="final mean reward" value={fmt(run.meanReward[run.meanReward.length - 1], 2)} tone="good" sub={`from ${fmt(run.meanReward[0], 2)}`} />
          <Stat label="best-action mass" value={fmt(Math.max(...run.finalProbs), 2)} sub={betaKl === 0 ? 'unleashed' : `KL-leashed (β=${betaKl.toFixed(2)})`} />
          <Stat label="final KL" value={fmt(run.klHistory[run.klHistory.length - 1], 3)} tone={betaKl === 0 ? 'warn' : 'good'} sub="drift from reference" />
        </div>
      </div>

      <Callout variant="idea">
        Crank β to 0 and reroll: the policy collapses onto the best arm — reward maximized,
        diversity destroyed (the entropy death behind reward hacking). Raise β and watch it hold
        near the reference: the eternal alignment trade between <em>optimizing the score</em> and{' '}
        <em>staying the model your data came from</em>. For real reasoning (R1-class) the rewards
        are verifiable — code that runs, math that checks — which keeps the signal honest.
      </Callout>
      <Callout variant="note">
        The bandit is the exact GRPO estimator (group-normalized advantages, sampled actions,
        KL-to-reference penalty) on a fixed 4-arm reward with noise; the policy is a categorical
        distribution over actions — the sequence-level special case of the token-level update.
        Verified: reward rises 0.8→1.4, β leash bounds drift.
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
