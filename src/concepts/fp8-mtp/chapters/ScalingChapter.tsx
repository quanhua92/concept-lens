import { useMemo, useState } from 'react'
import { Callout, Formula, Toggle } from '@/components/ui'
import { BarVector } from '@/components/viz'
import { mulberry32, randnVec, FMT_E4M3, floatBits, fromFloatBits } from '@/lib/math'
import { fmt } from '@/lib/utils'

export default function ScalingChapter() {
  const [outlier, setOutlier] = useState(50)
  const [scaled, setScaled] = useState(true)
  const [seed, setSeed] = useState(4)

  const { values, raw, fixed } = useMemo(() => {
    const rng = mulberry32(seed)
    const vals = randnVec(rng, 16, 1).map((v) => v * 2)
    vals[3] = outlier
    vals[11] = -outlier * 0.7
    const MAX = 448
    const s = scaled ? MAX / Math.max(...vals.map(Math.abs)) : 1
    const quant = (v: number) => {
      const bits = floatBits(v * s, FMT_E4M3)
      return fromFloatBits(bits, FMT_E4M3) / s
    }
    const rawQ = vals.map(quant)
    const maxErr = Math.max(...vals.map((v, i) => Math.abs(v - rawQ[i])))
    return { values: vals, raw: rawQ, fixed: maxErr }
  }, [outlier, scaled, seed])

  const rmse = useMemo(
    () => Math.sqrt(values.reduce((s, v, i) => s + (v - raw[i]) ** 2, 0) / values.length),
    [values, raw],
  )
  const relE = rmse / Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        E4M3’s ceiling is ±448 — but activations contain <em>outliers</em>: a few channels 50×
        larger than the rest. Unscaled, those outliers fit (barely) while every normal value
        collapses onto a handful of grid points. The fix is one division: scale the whole tensor
        to fill the format’s range, quantize, and multiply back at use time.
      </p>

      <Formula caption="Per-tensor scaling: x̃ = x·s with s = 448 / max|x| — dequantize by dividing. The scale travels with the tensor (4 bytes, amortized over millions).">
        x̂ = Q<sub>E4M3</sub>(x · s) / s,&emsp;s = E4M3<sub>max</sub> / max|x|
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
            <label className="block text-sm text-mute">outlier magnitude</label>
            <input
              type="range"
              min={5}
              max={440}
              step={5}
              value={outlier}
              onChange={(e) => setOutlier(Number(e.target.value))}
              className="mt-1"
              aria-label="outlier magnitude"
            />
            <p className="font-mono text-xs text-accent">{outlier}× normal scale</p>
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Toggle
              label="per-tensor scaling"
              checked={scaled}
              onChange={setScaled}
              color={scaled ? 'good' : 'delta'}
            />
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="self-start rounded-xl border border-line px-3 py-1.5 text-xs text-mute hover:border-zinc-600"
            >
              reroll values
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-dim">original activations (16 values, 2 outliers)</p>
            <BarVector values={values} maxAbs={Math.max(outlier, 3)} color="#a1a1aa" />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">
              after E4M3 round-trip {scaled ? '(scaled)' : '(raw — outliers eat the range)'}
            </p>
            <BarVector values={raw} maxAbs={Math.max(outlier, 3)} color={scaled ? '#34d399' : '#fb7185'} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="RMSE" value={fmt(rmse, 3)} tone={relE < 0.05 ? 'good' : 'bad'} />
          <Stat label="relative error" value={`${fmt(relE * 100, 1)}%`} tone={relE < 0.05 ? 'good' : 'bad'} />
          <Stat
            label="worst single error"
            value={fmt(fixed, 2)}
            sub={scaled ? 'spread across all values' : 'concentrated in the small ones'}
          />
        </div>
      </div>

      <Callout variant="idea">
        Scaling converts E4M3 from a fixed window into a <em>relative</em> precision format: the
        grid stretches to fit whatever you feed it. The failure mode it can’t fix is when outliers
        and fine detail must coexist — the outlier forces coarse steps for everyone (the
        quantization concept returns to this with per-group scales).
      </Callout>
      <Callout variant="note">
        Values are seeded Gaussians with planted outliers; encode/decode uses the site’s real
        E4M3 bit implementation (max finite 448, round-to-nearest). DeepSeek-V3 additionally uses
        tile-wise and per-block scales — the same idea at finer granularity.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-zinc-100'}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
