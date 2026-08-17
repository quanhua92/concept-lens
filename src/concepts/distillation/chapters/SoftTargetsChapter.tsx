import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { DistBars } from '@/components/viz'
import { softmax } from '@/lib/math'
import { fmt } from '@/lib/utils'

const CLASSES = ['cat', 'dog', 'fox', 'wolf', 'pet', 'wild']
const TEACHER_LOGITS = [4.2, 3.6, 2.4, 1.9, -0.5, -1.2]

export default function SoftTargetsChapter() {
  const [temperature, setTemperature] = useState(1)

  const soft = useMemo(() => softmax(TEACHER_LOGITS, temperature), [temperature])
  const hard = useMemo(() => {
    const p = softmax(TEACHER_LOGITS, 1)
    const best = p.indexOf(Math.max(...p))
    return p.map((_, i) => (i === best ? 1 : 0))
  }, [])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        A trained teacher, asked about an image, says more than “cat.” It says “cat 62% — but dog
        33%, fox 3%…” Those runner-up probabilities are{' '}
        <strong className="text-zinc-100">dark knowledge</strong>: how classes relate. Hard labels
        throw that away; distillation trains the student on the full distribution — softened by a
        temperature so the structure becomes visible.
      </p>

      <Formula caption="Hinton et al. (2015): divide logits by T before softmax. T=1 is the raw distribution; higher T reveals the inter-class geometry the argmax hides.">
        p<sub>i</sub> = softmax(z<sub>i</sub> / T)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="temperature T"
          value={temperature}
          min={0.5}
          max={8}
          step={0.25}
          onChange={setTemperature}
          format={(v) => v.toFixed(2)}
          hint="Watch the wolf/fox/pet structure emerge as T rises — then blur into mush."
        />

        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-dim">hard label (what supervised training sees)</p>
            <DistBars items={CLASSES.map((c, i) => ({ label: c, p: hard[i], color: '#71717a' }))} height={130} />
          </div>
          <div>
            <p className="mb-2 text-xs text-dim">
              teacher at T={temperature.toFixed(2)} (what the student matches)
            </p>
            <DistBars items={CLASSES.map((c, i) => ({ label: c, p: soft[i], color: '#22d3ee' }))} height={130} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-panel-2 p-4 font-mono text-xs leading-relaxed text-mute">
          <p>
            dark-knowledge ratio: p(dog)/p(fox) = {fmt(soft[1] / Math.max(soft[2], 1e-9), 1)}× at
            T={temperature.toFixed(2)} — vs{' '}
            {fmt(hard[1] / Math.max(hard[2], 1e-9), 1)} in the hard label (∞: “dog” and “fox” both
            read as zero)
          </p>
          <p className="mt-1.5">
            entropy: {fmt(-soft.reduce((s, p) => (p > 0 ? s + p * Math.log2(p) : s), 0), 2)} bits
            (hard label: 0 bits)
          </p>
        </div>
      </div>

      <Callout variant="idea">
        The gradient signal is the point: with hard labels, every non-cat class is equally wrong
        (“zero”). With soft targets the student learns dog ≫ fox ≫ pet — a{' '}
        <em>metric</em> over classes — from every single example. That extra bits-per-example is
        what lets a pruned model recover most of its teacher.
      </Callout>
      <Callout variant="note">
        Logits here are a fixed teacher vector (seeded choice, plausible scale); the softmax,
        entropy, and ratios are computed. In Hinton’s recipe the final loss mixes the soft match
        at high T with a small weight on the ordinary hard-label loss.
      </Callout>
    </div>
  )
}
