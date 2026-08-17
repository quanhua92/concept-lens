import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { gaussPdf, klNumeric } from '@/lib/math'
import { fmt } from '@/lib/utils'

type Direction = 'fwd' | 'rev'

const N = 200
const LO = -6
const HI = 8

export default function KlChapter() {
  const [mu, setMu] = useState(1.5)
  const [sd, setSd] = useState(0.8)
  const [direction, setDirection] = useState<Direction>('fwd')

  const teacher = useMemo(
    () => (x: number) => 0.6 * gaussPdf(x, -1, 0.7) + 0.4 * gaussPdf(x, 3.5, 1.0),
    [],
  )
  const student = useMemo(() => (x: number) => gaussPdf(x, mu, sd), [mu, sd])

  const fwd = useMemo(() => klNumeric(teacher, student, LO, HI, N), [teacher, student])
  const rev = useMemo(() => klNumeric(student, teacher, LO, HI, N), [teacher, student])

  const curve: Series[] = useMemo(() => {
    const xs = Array.from({ length: 80 }, (_, i) => LO + ((HI - LO) * i) / 79)
    return [
      { name: 'teacher (bimodal, fixed)', color: '#a1a1aa', points: xs.map(teacher) },
      { name: `student N(μ=${fmt(mu)}, σ=${fmt(sd)})`, color: direction === 'fwd' ? '#22d3ee' : '#fb7185', points: xs.map(student) },
    ]
  }, [teacher, student, mu, sd, direction])

  const shown = direction === 'fwd' ? fwd : rev

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Which direction you minimize changes what the student learns.{' '}
        <strong className="text-zinc-100">Forward KL</strong>, KL(teacher ‖ student), punishes any
        teacher mass the student misses → the student spreads to cover every mode.{' '}
        <strong className="text-zinc-100">Reverse KL</strong>, KL(student ‖ teacher), punishes
        student mass where the teacher has none → the student commits to a single mode. Fit the
        bimodal teacher yourself.
      </p>

      <Formula caption="Same formula, opposite failure modes: forward is mass-covering (fear of missing modes), reverse is mode-seeking (fear of hallucinating mass). Both KLs below are numerically integrated over the plotted densities.">
        KL(P‖Q) = ∫ p(x) log(p(x)/q(x)) dx
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: 'fwd', label: 'forward KL(T‖S)' },
              { value: 'rev', label: 'reverse KL(S‖T)' },
            ]}
            value={direction}
            onChange={setDirection}
            ariaLabel="kl direction"
          />
          <p className="font-mono text-xs">
            loss now:{' '}
            <span className={shown < 0.1 ? 'text-good' : shown < 1 ? 'text-delta' : 'text-bad'}>
              {fmt(shown, 3)}
            </span>{' '}
            <span className="text-dim">(other: {fmt(direction === 'fwd' ? rev : fwd, 3)})</span>
          </p>
        </div>

        <LineChart series={curve} xLabel="x" yLabel="density" height={220} />

        <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="student mean μ"
            value={mu}
            min={-3}
            max={5}
            step={0.1}
            onChange={setMu}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="student spread σ"
            value={sd}
            min={0.3}
            max={3}
            step={0.05}
            onChange={setSd}
            format={(v) => v.toFixed(2)}
            hint="Wide σ = cover both modes (forward KL happy); narrow σ parked on one mode (reverse KL happy)."
          />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-panel-2 p-4 text-sm leading-relaxed text-mute">
          {direction === 'fwd' ? (
            <>
              Forward view: the teacher’s left mode at x=−1 carries 60% of its mass. If your
              student ignores it, those tokens contribute{' '}
              <span className="font-mono text-bad">∫ p·log(p/ε → ∞</span>… the loss is merciless —
              widen σ until both hills are under the student.
            </>
          ) : (
            <>
              Reverse view: every bit of student density off the teacher’s hills is pure penalty.
              The cheap escape: park a narrow Gaussian on one mode and zero probability elsewhere —
              the classic mode-collapse of reverse-KL training.
            </>
          )}
        </div>
      </div>

      <Callout variant="idea">
        Standard distillation minimizes forward KL (the student chases the teacher) — forgiving,
        mass-covering. Reverse KL matters where hallucinating mass is fatal: sparse-MoE gate
        training, VAEs, and RLHF preference objectives (alignment concept returns to this).
      </Callout>
      <Callout variant="note">
        KL values are Simpson-integrated in-browser over [−6, 8] (200 intervals) against the
        plotted Gaussian mixture — no closed-form shortcuts. At μ≈1.4, σ≈2.6 forward KL dips
        under 0.05 while reverse KL stays high: one student, two very different verdicts.
      </Callout>
    </div>
  )
}
