import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Button, Callout, Formula, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { simulateGradient } from '@/lib/simulate'
import { fmt } from '@/lib/utils'

const MAG_FLOOR = 1e-8

export default function GradientChapter() {
  const reducedMotion = useReducedMotion()
  const [layers, setLayers] = useState(20)
  const [gain, setGain] = useState(0.15)
  const [seed, setSeed] = useState(11)
  const [cursor, setCursor] = useState<number | null>(null)

  const sim = useMemo(
    () => simulateGradient({ layers, blockGain: gain, noise: 0.08, seed }),
    [layers, gain, seed],
  )

  useEffect(() => {
    setCursor(null)
  }, [layers, gain, seed])

  const play = () => {
    for (let t = 0; t <= layers; t++) {
      const delay = reducedMotion ? 0 : t * 240
      setTimeout(() => setCursor(t), delay)
    }
  }

  const hiddenCount = cursor === null ? 0 : Math.max(0, layers - cursor)
  const withPoints = sim.withResidual.slice(hiddenCount).map((v) => Math.max(Math.abs(v), MAG_FLOOR))
  const withoutPoints = sim.withoutResidual.slice(hiddenCount).map((v) => Math.max(Math.abs(v), MAG_FLOOR))

  const series: Series[] = [
    {
      name: '∂L/∂x · with residual',
      color: '#22d3ee',
      points: withPoints,
      offset: hiddenCount,
    },
    {
      name: '∂L/∂x · without residual',
      color: '#fb7185',
      points: withoutPoints,
      offset: hiddenCount,
    },
  ]

  const gWith = sim.withResidual[0]
  const gWithout = sim.withoutResidual[0]
  const killed = gain === 0

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Forward stability is only half the story. Training pushes a gradient signal{' '}
        <strong className="text-zinc-100">backwards</strong> through every block, and each block
        multiplies it by the derivative of its own transform. Deep chains of multiplies collapse to
        zero (vanishing gradients) — unless there is an <span className="text-accent">identity
        path</span> the gradient can ride.
      </p>

      <Formula caption="Backward through one block. With the residual, the derivative of (x + F(x)) is I + ∂F/∂x — the identity term gives gradients a guaranteed lane even when ∂F/∂x ≈ 0.">
        x′ = x + F(x)&emsp;⇒&emsp;∂x′/∂x = <span className="text-accent">I</span> + ∂F/∂x
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="depth (layers)"
            value={layers}
            min={4}
            max={32}
            onChange={setLayers}
            format={(v) => `${v}`}
          />
          <Slider
            label="block derivative g (∂F/∂x, scalar stand-in)"
            value={gain}
            min={0}
            max={1.2}
            step={0.05}
            onChange={setGain}
            format={(v) => fmt(v)}
            hint="How much signal each block's own path passes. Try 0 — a block that learns nothing."
          />
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button variant="primary" onClick={play}>
              Send gradient backward →
            </Button>
            <Button
              onClick={() => {
                setGain(0)
                setLayers(24)
              }}
            >
              Preset: kill the block (g = 0)
            </Button>
            <Button onClick={() => setSeed((s) => s + 1)}>Reroll</Button>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">
            |gradient| at each layer as it travels from the loss back to the input (log scale)
          </p>
          <LineChart series={series} xLabel="layer (0 = input)" yLabel="|∂L/∂x|" logScale xMax={layers - 1} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
            <p className="text-[11px] tracking-wide text-dim uppercase">gradient at input</p>
            <p className="mt-1 font-mono text-xl text-good">{fmt(gWith, 3)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-dim">with residual</p>
          </div>
          <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
            <p className="text-[11px] tracking-wide text-dim uppercase">gradient at input</p>
            <p className="mt-1 font-mono text-xl text-bad">
              {Math.abs(gWithout) < MAG_FLOOR ? '≈ 0' : fmt(gWithout, 3)}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-dim">without residual</p>
          </div>
          <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
            <p className="text-[11px] tracking-wide text-dim uppercase">ratio</p>
            <p className="mt-1 font-mono text-xl text-zinc-100">
              {fmt(Math.max(Math.abs(gWith), MAG_FLOOR) / Math.max(Math.abs(gWithout), MAG_FLOOR), 0)}×
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-dim">residual / no-residual</p>
          </div>
        </div>
      </div>

      {killed ? (
        <Callout variant="warn" title="The g = 0 case is the whole point">
          Each block passes nothing of its own — ∂F/∂x = 0. Without residuals, the gradient dies
          completely: nothing at the input ever learns. With residuals,{' '}
          <span className="font-mono text-accent">I + 0 = I</span>: the gradient arrives at the
          input at full strength. Early layers keep learning no matter how deep or how useless the
          blocks in between are.
        </Callout>
      ) : (
        <Callout variant="idea" title="The identity is a gradient highway">
          across L blocks the backward signal is a product of{' '}
          <span className="font-mono text-accent">(I + J₁)(I + J₂)…(I + J_L)</span> versus{' '}
          <span className="font-mono text-bad">J₁J₂…J_L</span>. Products of bare Jacobians collapse
          toward zero exponentially; the identity terms keep the product anchored near 1 as long as
          block derivatives stay small — which initialization, LayerNorm, and training itself all
          encourage. That is why 100-layer transformers train at all.
        </Callout>
      )}

      <Callout variant="note" title="What we simplified">
        Real ∂F/∂x is a d×d matrix per block, and attention heads, MLPs, and LayerNorm all mix
        gradients together. The scalar g here compresses that story to one number, but the
        conclusion — an additive identity path keeps gradient magnitude bounded across depth — is
        exactly what happens in full networks.
      </Callout>
    </div>
  )
}
