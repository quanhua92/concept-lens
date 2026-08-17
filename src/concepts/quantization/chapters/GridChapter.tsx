import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { BarVector } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { makeWeights, quantizeGrouped, quantizeTensor } from '../lib'

export default function GridChapter() {
  const [bits, setBits] = useState(4)
  const [outlierMag, setOutlierMag] = useState(1.5)
  const [groupSize, setGroupSize] = useState(8)

  const weights = useMemo(() => makeWeights(11, 32, outlierMag, [3]), [outlierMag])
  const tensor = useMemo(() => quantizeTensor(weights, bits), [weights, bits])
  const grouped = useMemo(() => quantizeGrouped(weights, bits, groupSize), [weights, bits, groupSize])

  const levels = Math.pow(2, bits) - 1

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Quantization maps every weight onto a fixed grid of{' '}
        <strong className="text-zinc-100">2ᵇⁱᵗˢ levels</strong> and stores only the small integer
        index plus one scale per group. At 4 bits, a level count of {levels.toLocaleString()} sounds
        brutal — yet LLMs lose almost nothing, because what matters is not absolute precision but{' '}
        <em>relative precision within a group</em>.
      </p>

      <Formula caption="Symmetric per-group quantization: scale s = max|x|/levels in each group of g weights; store round(x/s), dequantize by x̂ = q·s.">
        x̂ = round(x / s) · s,&emsp;s = max<sub>group</sub>|x| / (2<sup>bits</sup> − 1)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <Slider label="bits per weight" value={bits} min={2} max={8} onChange={setBits} format={(v) => `${v}`} hint={`${levels.toLocaleString()} levels · ${fmt((bits / 16) * 100, 0)}% of FP16 size`} />
          <Slider label="group size g" value={groupSize} min={2} max={32} step={2} onChange={setGroupSize} format={(v) => `${v}`} hint="Smaller groups = more scales = finer grids. Production: 64–128." />
          <Slider label="outlier magnitude" value={outlierMag} min={0.5} max={4} step={0.1} onChange={setOutlierMag} format={(v) => v.toFixed(1)} hint="One weight (index 3) planted at this size." />
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className="mb-2 text-xs text-dim">original weights (32 values, one outlier)</p>
            <BarVector values={weights} maxAbs={4} color="#a1a1aa" />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">
              per-tensor {bits}-bit — one scale for all: outlier drags every step wide
            </p>
            <BarVector values={tensor.deq} maxAbs={4} color="#fb7185" />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">
              per-group ({groupSize}) {bits}-bit — the outlier only ruins its own group
            </p>
            <BarVector values={grouped.deq} maxAbs={4} color="#22d3ee" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="per-tensor RMSE" value={fmt(tensor.rmse, 4)} tone="bad" />
          <Stat label={`per-group (g=${groupSize}) RMSE`} value={fmt(grouped.rmse, 4)} tone="good" sub={`${fmt((1 - grouped.rmse / Math.max(tensor.rmse, 1e-9)) * 100, 0)}% better`} />
          <Stat label="levels available" value={levels.toLocaleString()} sub={`at ${bits} bits`} />
        </div>
      </div>

      <Callout variant="idea">
        Watch the middle bars at high outlier magnitude: per-tensor 4-bit flattens normal weights
        onto a handful of grid points (the outlier’s scale governs everything), while per-group
        keeps them sharp. This single observation — <em>outliers should pay their own way</em> — is
        the core of GPTQ/AWQ-class methods: protect or isolate outlier channels, quantize the rest
        aggressively.
      </Callout>
      <Callout variant="note">
        Weights are seeded Gaussians with one planted outlier; RMSE is computed over the actual
        round-trip. Real pipelines also pack scales/zero-points (a few % overhead) and calibrate
        against activations instead of using raw max — this demo shows the geometry, not the
        calibration trickery.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
