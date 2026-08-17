import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider, Button } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { simulateDepth } from '@/lib/simulate'
import { fmt } from '@/lib/utils'

type ScaleMode = 'linear' | 'log'

export default function WithWithoutChapter() {
  const [layers, setLayers] = useState(24)
  const [gain, setGain] = useState(1.25)
  const [alpha, setAlpha] = useState(0.25)
  const [seed, setSeed] = useState(5)
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear')

  const sim = useMemo(
    () => simulateDepth({ layers, blockGain: gain, writeStrength: alpha, dModel: 32, seed }),
    [layers, gain, alpha, seed],
  )

  const series: Series[] = [
    {
      name: 'with residual (x + write)',
      color: '#22d3ee',
      points: sim.layerNormsWithResidual,
    },
    {
      name: 'without residual (g·x + write)',
      color: '#fb7185',
      points: sim.layerNormsWithoutResidual,
    },
  ]

  const ratio = sim.finalWithout / Math.max(sim.finalWith, 1e-9)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        One block adding a delta is nice. But transformers stack{' '}
        <strong className="text-zinc-100">dozens of blocks</strong>. Does the “+” still matter at
        depth? Run the simulation: the same stream pushed through the same stack, with and without
        the residual path.
      </p>

      <Formula caption="Toy model — each block either adds a bounded write (residual) or transforms the signal by a gain g and adds the write (no residual). All values below are computed live from this.">
        with: x ← x + α·u&emsp;&emsp;without: x ← <span className="text-bad">g</span>·x + α·u
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="depth (layers)"
            value={layers}
            min={4}
            max={48}
            onChange={setLayers}
            format={(v) => `${v}`}
          />
          <Slider
            label="block gain g"
            value={gain}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={setGain}
            format={(v) => fmt(v)}
            hint="How much each block scales the signal when there is no skip path. g = 1 is balanced."
          />
          <Slider
            label="write strength α"
            value={alpha}
            min={0.05}
            max={0.6}
            step={0.05}
            onChange={setAlpha}
            format={(v) => fmt(v)}
            hint="Size of each block's additive write, relative to the embedding."
          />
          <div className="flex items-end gap-2">
            <Button onClick={() => setSeed((s) => s + 1)}>Reroll writes</Button>
            <Button onClick={() => setGain(1)}>Reset g = 1</Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-dim">‖x‖ after each layer — one representative token</p>
            <SegmentedControl
              options={[
                { value: 'linear', label: 'linear' },
                { value: 'log', label: 'log' },
              ]}
              value={scaleMode}
              onChange={setScaleMode}
              ariaLabel="chart scale"
            />
          </div>
          <LineChart
            series={series}
            xLabel="layer"
            yLabel="‖x‖"
            logScale={scaleMode === 'log'}
            xMax={layers}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="embedding norm" value={fmt(sim.baseNorm)} tone="dim" />
          <Stat
            label={`final norm · with residual`}
            value={fmt(sim.finalWith)}
            tone="good"
            sub={`${fmt(sim.finalWith / sim.baseNorm)}× input`}
          />
          <Stat
            label="final norm · without"
            value={fmt(sim.finalWithout)}
            tone={gain > 1.05 ? 'bad' : gain < 0.95 ? 'warn' : 'dim'}
            sub={`${fmt(ratio)}× the residual run`}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Callout variant="idea" title="Why the curves have these shapes">
          Additive writes accumulate like random steps: the norm grows roughly as{' '}
          <span className="font-mono text-accent">√L</span> — slow, stable, predictable. The
          non-residual path multiplies by g every layer:{' '}
          <span className="font-mono text-bad">g^L</span>. Set g = 1.25 with depth 48 and watch the
          norm explode by 10⁵; set g = 0.8 and watch it vanish.
        </Callout>
        <Callout variant="note" title="Isn’t this just a toy model?">
          Yes — and deliberately so. Real blocks are matrices, not scalars, but the math is the
          same story told in singular values: products of random-ish matrices without identity
          terms concentrate near 0 or ∞, while products of (I + small) stay well-behaved. LayerNorm
          (not shown) additionally re-projects rows, which is why real streams don’t literally grow
          as √L.
        </Callout>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'good' | 'bad' | 'warn' | 'dim'
}) {
  const color =
    tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-delta' : 'text-zinc-100'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[11px] text-dim">{sub}</p> : null}
    </div>
  )
}
