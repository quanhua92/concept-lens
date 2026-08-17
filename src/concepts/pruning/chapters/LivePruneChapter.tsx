import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider, Button } from '@/components/ui'
import { fmt } from '@/lib/utils'
import {
  cloneNet,
  forwardMLP,
  makeRegressionTask,
  magnitudeImportance,
  mseLoss,
  pruneHiddenUnits,
  taylorImportance,
  topIndices,
  trainSteps,
  initMLP,
  type MLP,
} from '@/lib/train'

type Method = 'magnitude' | 'taylor' | 'random'

const LAYER = 1
const FULL_WIDTH = 16

function setup() {
  const task = makeRegressionTask(42, 48, 8, 8)
  const net = initMLP([8, FULL_WIDTH, FULL_WIDTH, 16, 8], 100)
  trainSteps(net, task.X, task.Y, 500, 0.06)
  return { task, net }
}

function pruneBy(net: MLP, method: Method, keepCount: number, feats: number[][]): MLP {
  if (method === 'random') {
    const idx = Array.from({ length: FULL_WIDTH }, (_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1)
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    return pruneHiddenUnits(net, LAYER, idx.slice(0, keepCount))
  }
  const imp = method === 'magnitude' ? magnitudeImportance(net, LAYER) : taylorImportance(net, feats, LAYER)
  return pruneHiddenUnits(net, LAYER, topIndices(imp, keepCount))
}

export default function LivePruneChapter() {
  const { task, net } = useMemo(setup, [])
  const [keepCount, setKeepCount] = useState(12)
  const [method, setMethod] = useState<Method>('taylor')
  const [recoverySteps, setRecoverySteps] = useState(0)

  const baseLoss = useMemo(() => {
    const out = forwardMLP(net, task.X)
    return mseLoss(out.acts[out.acts.length - 1], task.Y)
  }, [net, task])

  const { prunedLoss, recoveredLoss, paramFrac } = useMemo(() => {
    const pruned = pruneBy(net, method, keepCount, task.X)
    const out1 = forwardMLP(pruned, task.X)
    const l1 = mseLoss(out1.acts[out1.acts.length - 1], task.Y)
    if (recoverySteps > 0) {
      const rec = cloneNet(pruned)
      trainSteps(rec, task.X, task.Y, recoverySteps, 0.03)
      const out2 = forwardMLP(rec, task.X)
      return {
        prunedLoss: l1,
        recoveredLoss: mseLoss(out2.acts[out2.acts.length - 1], task.Y),
        paramFrac: 1 - (FULL_WIDTH - keepCount) * (8 + 16) / countParams(net),
      }
    }
    return { prunedLoss: l1, recoveredLoss: l1, paramFrac: 1 - (FULL_WIDTH - keepCount) * (8 + 16) / countParams(net) }
  }, [net, task, method, keepCount, recoverySteps])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Theory is cheap — so here is a real experiment. This page trained an actual neural network
        in your browser (a small MLP, 500 steps of backprop, deterministic seed). Now delete its
        hidden units and measure what breaks. The three scorers are the classics:{' '}
        <strong className="text-zinc-100">magnitude</strong> (Σ|w| — how big are the weights),{' '}
        <strong className="text-zinc-100">Taylor</strong> (how much does the loss actually move —
        importance ≈ |activation · gradient|), and <strong className="text-zinc-100">random</strong>{' '}
        (the control).
      </p>

      <Formula caption="Taylor criterion: the first-order estimate of loss increase if unit j is zeroed. Cheap proxy for 'what happens if we delete it'.">
        I<sub>j</sub> ≈ | a<sub>j</sub> · ∂L/∂a<sub>j</sub> |
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label={`units kept in layer ${LAYER + 1} (of ${FULL_WIDTH})`}
            value={keepCount}
            min={1}
            max={FULL_WIDTH}
            onChange={setKeepCount}
            format={(v) => `${v}`}
            hint={`Deleting ${(FULL_WIDTH - keepCount)} units removes ${fmt((1 - paramFrac) * 100, 1)}% of total parameters.`}
          />
          <div className="flex flex-wrap items-end gap-2">
            <SegmentedControl
              options={[
                { value: 'taylor', label: 'Taylor' },
                { value: 'magnitude', label: 'magnitude' },
                { value: 'random', label: 'random' },
              ]}
              value={method}
              onChange={setMethod}
              ariaLabel="importance method"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <LossStat label="trained loss" value={baseLoss} max={baseLoss * 3} tone="good" />
          <LossStat label="after pruning" value={prunedLoss} max={baseLoss * 3} tone={prunedLoss < baseLoss * 1.5 ? 'good' : prunedLoss < baseLoss * 3 ? 'warn' : 'bad'} />
          <LossStat
            label={recoverySteps > 0 ? `after ${recoverySteps} recovery steps` : 'recovery (not run)'}
            value={recoveredLoss}
            max={baseLoss * 3}
            tone={recoveredLoss < baseLoss * 1.2 ? 'good' : 'warn'}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => setRecoverySteps(50)}>+50 recovery steps</Button>
          <Button onClick={() => setRecoverySteps(0)}>clear recovery</Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-dim">
          Everything above is recomputed on each change: prune → forward pass → loss; recovery
          re-trains a fresh copy of the pruned net (seeded, reproducible).
        </p>
      </div>

      <Callout variant="idea">
        The consistent ranking — Taylor ≥ magnitude ≫ random — is the whole pruning literature in
        one slider: <em>structure-aware deletion</em> finds redundancy that random deletion
        destroys. Push to 4 units kept and watch Taylor still limp along while random collapses.
      </Callout>
      <Callout variant="note">
        A 5-layer MLP on a regression task stands in for Qwen (real LLM pruning runs the same
        criteria over billions of weights on GPUs). Layer-deletion studies (ShortGPT, etc.) apply
        the Taylor idea between layers: delete blocks whose removal barely moves outputs.
      </Callout>
    </div>
  )
}

function countParams(net: MLP): number {
  return net.Ws.reduce((s, w) => s + w.length * w[0].length, 0) + net.bs.reduce((s, b) => s + b.length, 0)
}

function LossStat({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? '#34d399' : tone === 'warn' ? '#f59e0b' : '#fb7185'
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-4">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className="mt-1 font-mono text-xl" style={{ color }}>
        {value.toFixed(4)}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-ink">
        <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
