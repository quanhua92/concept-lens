import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { buildScene, recoveryCurve } from '../recovery'

type Mode = 'kd' | 'hard'

const CHUNKS = 8

export default function RecoveryChapter() {
  const scene = useMemo(buildScene, [])
  const [temperature, setTemperature] = useState(3)
  const [mode, setMode] = useState<Mode>('kd')

  const kd = useMemo(() => recoveryCurve(scene, 'kd', temperature, CHUNKS), [scene, temperature])
  const hard = useMemo(() => recoveryCurve(scene, 'hard', 1, CHUNKS), [scene])

  const series: Series[] = [
    { name: `distillation (T=${fmt(temperature, 1)})`, color: '#22d3ee', points: kd.curve },
    { name: 'hard labels (control)', color: '#fb7185', points: hard.curve },
  ]

  const gapClosed = (kd.finalAcc - scene.prunedAcc) / Math.max(scene.fullAcc - scene.prunedAcc, 1e-9)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Pruning wounds; distillation heals. Everything on this page is trained live in your
        browser: a teacher learned a noisy 6-class task, a student learned it, then the student was
        cut to 4 hidden units. The pruned model now re-learns from the full model — matching its{' '}
        <em>soft outputs</em> (distillation) or just its argmax labels (control) — and we score on
        a held-out test set.
      </p>

      <Formula caption="Recovery objective: soft cross-entropy against the surviving model's full output distribution at temperature T, vs one-hot argmax targets. Same optimizer, same steps — only the target differs.">
        KD: −Σ p<sup>T</sup><sub>teacher</sub> log p<sup>T</sup><sub>student</sub>&emsp;·&emsp;hard: −log p(argmax)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: 'kd', label: 'distillation' },
              { value: 'hard', label: 'hard labels' },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="recovery mode (both curves always shown)"
          />
          <p className="font-mono text-xs text-dim">
            teacher {fmt(scene.teacherAcc * 100, 0)}% · full model {fmt(scene.fullAcc * 100, 0)}% ·
            pruned {fmt(scene.prunedAcc * 100, 0)}% (test set)
          </p>
        </div>

        <div className="max-w-sm">
          <Slider
            label="distillation temperature T"
            value={temperature}
            min={1}
            max={8}
            step={0.5}
            onChange={setTemperature}
            format={(v) => v.toFixed(1)}
            hint="Softens the teacher's output distribution. The KD curve recomputes live."
          />
        </div>

        <div className="mt-6">
          <LineChart
            series={series}
            xMax={CHUNKS - 1}
            xTickLabels={Array.from({ length: CHUNKS }, (_, i) => String((i + 1) * 60))}
            xLabel="recovery steps"
            yLabel="held-out accuracy"
            height={240}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="pruned, before recovery" value={`${fmt(scene.prunedAcc * 100, 0)}%`} tone="bad" />
          <Stat
            label={`after KD recovery (T=${fmt(temperature, 1)})`}
            value={`${fmt(kd.finalAcc * 100, 0)}%`}
            tone="good"
            sub={`closed ${fmt(gapClosed * 100, 0)}% of the pruning gap`}
          />
          <Stat label="after hard-label recovery" value={`${fmt(hard.finalAcc * 100, 0)}%`} tone="warn" sub="same budget, less signal" />
        </div>
      </div>

      <Callout variant="idea">
        Both recoveries work — the interesting part is the gap. Soft targets encode{' '}
        <em>which wrong answers are near-right</em> for every example, so each step carries more
        bits than an argmax. When you crank T too high the structure blurs into uniformity and the
        advantage fades — temperature is a real hyperparameter, not decoration.
      </Callout>
      <Callout variant="note">
        Deterministic scene: seeded teacher/student training (500 steps each), Taylor-pruned to 4
        units, 8 recovery chunks of 60 steps, 180-sample held-out set, all re-run on every slider
        move. Real LLM recovery (Sheared-LLaMA, Llama-3.2) runs this recipe at billion-parameter
        scale and recovers most benchmark performance for a few percent of pretraining cost.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-delta' : 'text-bad'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
