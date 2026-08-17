import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { HeatmapGrid, HeatmapLegend } from '@/components/viz'
import { fmtBig } from '@/lib/format'
import { fmt } from '@/lib/utils'
import { randnMat, mulberry32 } from '@/lib/math'
import { deltaW, loraAdapterParams, makeAdapter, totalParams } from '../lib'

export default function AdapterChapter() {
  const [rank, setRank] = useState(4)
  const [alpha, setAlpha] = useState(16)
  const [trained, setTrained] = useState(false)

  const W = useMemo(() => randnMat(mulberry32(5), 16, 16, 0.3), [])
  const { A, B } = useMemo(() => makeAdapter(9, 16, 16), [])
  const [Btrained] = useMemo(() => {
    const rng = mulberry32(21)
    const Bt = B.map((row) => row.map(() => (rng() - 0.5) * 0.3))
    return [Bt]
  }, [B])

  const Buse = trained ? Btrained : B
  const delta = useMemo(() => deltaW(A, Buse, alpha), [A, Buse, alpha])
  const merged = useMemo(() => W.map((row, i) => row.map((x, j) => x + delta[i][j])), [W, delta])

  const scaleMax = useMemo(
    () => Math.max(...merged.flat().map(Math.abs), ...delta.flat().map(Math.abs), 1e-9),
    [merged, delta],
  )
  const deltaMax = useMemo(() => Math.max(...delta.flat().map(Math.abs), 1e-9), [delta])

  const adapterParams = loraAdapterParams(rank)
  const total = totalParams()

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The adapter is two thin matrices beside every frozen linear layer:{' '}
        <code className="rounded bg-panel-2 px-1 font-mono text-xs text-accent">A</code> (r×d,
        Gaussian init) maps down,{' '}
        <code className="rounded bg-panel-2 px-1 font-mono text-xs text-delta">B</code> (d×r){' '}
        <strong className="text-zinc-100">initialized to zero</strong> — so training starts exactly
        at the pretrained model. The effective update is (α/r)·B·A, learned end-to-end.
      </p>

      <Formula caption="Forward: h = Wx + (α/r)·B·A·x. Only B and A receive gradients; W stays frozen. At r ≪ d the trainable count is a rounding error.">
        W′ = W + (α/r) · B·A
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="rank r"
            value={rank}
            min={1}
            max={16}
            onChange={setRank}
            format={(v) => `${v}`}
            hint="Capacity of the update — the dimension of the subspace it can edit."
          />
          <Slider
            label="α (scaling numerator)"
            value={alpha}
            min={1}
            max={32}
            onChange={setAlpha}
            format={(v) => `${v}`}
            hint={`Effective update scale = α/r = ${fmt(alpha / rank, 2)}. Common practice: α = 2r.`}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTrained((t) => !t)}
            className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
              trained ? 'border-good/50 bg-good/10 text-good' : 'border-line text-mute hover:border-zinc-600'
            }`}
          >
            {trained ? 'B trained (adapter active)' : 'B = 0 (training not started)'}
          </button>
          <p className="text-xs text-dim">
            {trained
              ? 'ΔW = (α/r)·B·A — a rank-≤r edit riding on the frozen weights.'
              : 'B is still zero: ΔW = 0 and the model is exactly the pretrained one.'}
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs text-dim">frozen W (pretrained)</p>
            <HeatmapGrid values={W} scale={scaleMax} ariaLabel="frozen pretrained weights" />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">ΔW = (α/r)·B·A (the adapter)</p>
            <HeatmapGrid values={delta} scale={scaleMax} ariaLabel="low rank update" />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">merged W′ = W + ΔW</p>
            <HeatmapGrid values={merged} scale={scaleMax} ariaLabel="merged weights" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <HeatmapLegend />
          <span className="font-mono text-[11px] text-dim">‖ΔW‖/‖W‖ = {fmt((deltaMax * 16) / (scaleMax * 16), 2)}</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label={`adapter params (r=${rank}, Qwen2.5-7B, all-linear)`} value={fmtBig(adapterParams)} sub={`${fmt((adapterParams / total) * 100, 2)}% of the model`} />
          <Stat label="full fine-tune trains" value={fmtBig(total)} sub="every weight" />
          <Stat label="gradient memory story" value="gradients + optimizer states only for B, A" sub="Adam’s states are the real cost — they scale with trainable params" />
        </div>
      </div>

      <Callout variant="idea">
        Zero-init B is the quiet genius: the adapter starts as a no-op, so the first forward pass
        reproduces the base model exactly — training only learns the <em>difference</em>. And α/r
        decouples update magnitude from rank, so you can change capacity without re-tuning lr.
      </Callout>
      <Callout variant="note">
        The “trained” toggle swaps B for a seeded non-zero stand-in (real adapter training on an
        actual task would need a dataset and minutes — the mechanics, shapes, and scaling shown
        are exact). Param census uses Qwen2.5-7B dims (all-linear targets: q, k, v, o + gate,
        up, down).
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg text-zinc-100">{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
