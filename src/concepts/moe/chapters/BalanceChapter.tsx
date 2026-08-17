import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { trainRouter } from '../lib'

type Curve = 'maxload' | 'aux'

export default function BalanceChapter() {
  const [auxWeight, setAuxWeight] = useState(1)
  const [curve, setCurve] = useState<Curve>('maxload')

  const balanced = useMemo(() => trainRouter(7, 8, 2, 60, auxWeight, false), [auxWeight])
  const collapsed = useMemo(() => trainRouter(7, 8, 2, 60, 0, true), [])

  const series: Series[] =
    curve === 'maxload'
      ? [
          { name: 'with balancing loss', color: '#22d3ee', points: balanced.run.maxLoadFrac },
          { name: 'winner-takes-all (no balancing)', color: '#fb7185', points: collapsed.run.maxLoadFrac },
        ]
      : [
          { name: 'aux loss (balancing run)', color: '#f59e0b', points: balanced.run.auxLoss },
        ]

  const target = (2 * 2) / 8

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        MoE has a fatal flaw: routers are greedy. An expert that gets picked gets trained, gets
        better, gets picked more — a rich-get-richer spiral ends with 2 experts doing all the work
        and 254 dead ones. The fix is a <strong className="text-zinc-100">load-balancing loss</strong>:
        a penalty computed from actual routing statistics, pushing the router toward even
        distribution. Below, both dynamics are really trained, live.
      </p>

      <Formula caption="Switch-style auxiliary loss: f_i = fraction of tokens routed to expert i, P_i = mean router probability. The product punishes 'high probability AND high load' — exactly the runaway case. Minimum at even load.">
        L<sub>aux</sub> = α · E · Σ<sub>i</sub> f<sub>i</sub> · P<sub>i</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="balancing strength α"
            value={auxWeight}
            min={0}
            max={3}
            step={0.1}
            onChange={setAuxWeight}
            format={(v) => v.toFixed(1)}
            hint="Gradient steps on router logits use real dL/dlogit from the formula above."
          />
          <div className="flex items-end">
            <SegmentedControl
              options={[
                { value: 'maxload', label: 'expert load' },
                { value: 'aux', label: 'aux loss' },
              ]}
              value={curve}
              onChange={setCurve}
              ariaLabel="chart"
            />
          </div>
        </div>

        <LineChart
          series={series}
          xMax={59}
          xLabel="router training step"
          yLabel={curve === 'maxload' ? 'max expert load (frac of tokens)' : 'aux loss'}
          height={240}
        />
        <p className="mt-2 font-mono text-xs text-mute">
          balanced target: {target.toFixed(2)} of tokens on the busiest expert · collapse run
          reaches 1.00 (one expert takes everything)
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel-2 p-4">
            <p className="text-xs text-dim">with balancing (α={auxWeight.toFixed(1)})</p>
            <p className="mt-1 font-mono text-sm text-good">
              max load {balanced.run.maxLoadFrac[0].toFixed(2)} → {balanced.run.maxLoadFrac[59].toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-panel-2 p-4">
            <p className="text-xs text-dim">self-reinforcing router (toy winner-takes-all)</p>
            <p className="mt-1 font-mono text-sm text-bad">
              max load {collapsed.run.maxLoadFrac[0].toFixed(2)} → {collapsed.run.maxLoadFrac[59].toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <Callout variant="idea">
        The loss couples two statistics: P (what the router <em>wants</em>) and f (what actually{' '}
        <em>happened</em>). A dead expert has f=0 → no pressure; an overloaded one has both high →
        maximum pressure. It’s a thermostat, not a rule.
      </Callout>
      <Callout variant="note">
        DeepSeek-V3 actually goes further: <em>auxiliary-loss-free</em> balancing — a per-expert bias
        added at selection time and nudged up/down by observed load, plus a tiny (α=0.0001)
        sequence-wise loss. Same thermostat idea, without distorting gradients. The collapse run is
        a toy positive-feedback model of the training failure mode, not a trained network.
      </Callout>
    </div>
  )
}
