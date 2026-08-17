import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Callout, Formula, Slider, Toggle } from '@/components/ui'
import { DistBars } from '@/components/viz'
import { mulberry32, sampleFromLogits } from '@/lib/math'
import { VOCAB, lmForward, makeTinyLM } from '../lib'

const START: number[] = [0, 1]
const MAX_NEW = 8

export default function SamplingChapter() {
  const lm = useMemo(() => makeTinyLM(42), [])
  const [temperature, setTemperature] = useState(1)
  const [useTopK, setUseTopK] = useState(false)
  const [topK, setTopK] = useState(3)
  const [useTopP, setUseTopP] = useState(false)
  const [topP, setTopP] = useState(0.9)
  const [ids, setIds] = useState<number[]>(START)
  const [last, setLast] = useState<{ probs: number[]; index: number } | null>(null)
  const [seed, setSeed] = useState(1)

  const rng = useMemo(() => mulberry32(seed), [seed])
  const { logits } = useMemo(() => lmForward(lm, ids), [lm, ids])

  const step = () => {
    const { index, probs } = sampleFromLogits(
      logits,
      rng,
      temperature,
      useTopK ? topK : undefined,
      useTopP ? topP : undefined,
    )
    setLast({ probs, index })
    setIds((cur) => (cur.length >= START.length + MAX_NEW ? cur : [...cur, index]))
  }

  const top = useMemo(() => {
    const order = logits.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 10)
    return order.map(([, i]) => i)
  }, [logits])
  const shown = last?.probs ?? []
  const highlightShown = last ? top.indexOf(last.index) : -1

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The logits give a score for every token; <strong className="text-zinc-100">sampling</strong>{' '}
        turns scores into a choice. Temperature reshapes the distribution, top-k cuts it to the k
        best, top-p cuts it to the smallest set covering probability p. Same model, same logits —
        very different outputs.
      </p>

      <Formula caption="Each knob edits the distribution before one sample is drawn. Low temperature → near-argmax; high → near-uniform.">
        P(token) = softmax(logits / T), then keep top-k or top-p, renormalize, sample
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="temperature"
            value={temperature}
            min={0.05}
            max={3}
            step={0.05}
            onChange={setTemperature}
            format={(v) => v.toFixed(2)}
            hint="Divides the logits. Below 1 sharpens; above 1 flattens."
          />
          <div className="space-y-3">
            <Toggle label="top-k" checked={useTopK} onChange={setUseTopK} />
            {useTopK ? (
              <Slider label="k" value={topK} min={1} max={10} onChange={setTopK} format={(v) => `${v}`} />
            ) : null}
          </div>
          <div className="space-y-3">
            <Toggle label="top-p (nucleus)" checked={useTopP} onChange={setUseTopP} color="good" />
            {useTopP ? (
              <Slider label="p" value={topP} min={0.1} max={1} step={0.05} onChange={setTopP} format={(v) => v.toFixed(2)} />
            ) : null}
          </div>
          <div className="flex items-end gap-2">
            <Button variant="primary" onClick={step}>
              Sample token →
            </Button>
            <Button
              onClick={() => {
                setIds(START)
                setLast(null)
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setSeed((s) => s + 1)}>Reroll</Button>
          </div>
        </div>

        {shown.length ? (
          <div className="mt-6">
            <p className="mb-2 text-xs text-dim">sampling distribution (top 10 logits, post-knobs)</p>
            <DistBars
              items={top.map((i) => ({ label: VOCAB[i], p: shown[i], color: '#22d3ee' }))}
              highlight={highlightShown >= 0 ? highlightShown : null}
              height={130}
            />
          </div>
        ) : (
          <p className="mt-6 text-xs text-dim">Press “Sample token” to draw from the distribution.</p>
        )}

        <div className="mt-6">
          <p className="mb-2 text-xs text-dim">sequence so far (autoregressive — each token rejoins the input)</p>
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {ids.map((id, i) => (
              <motion.span
                key={`${id}-${i}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
                  i < START.length ? 'border-line bg-panel-2 text-mute' : 'border-delta/40 bg-delta/10 text-delta'
                }`}
              >
                {VOCAB[id]}
              </motion.span>
            ))}
            <span className="flex items-center px-1 font-mono text-xs text-dim">▁</span>
          </div>
        </div>
      </div>

      <Callout variant="idea">
        Generation is just this loop: forward pass → sample one token → append → repeat. Everything
        expensive (the blocks, the KV cache — next concepts) exists to make each iteration of this
        loop fast.
      </Callout>
      <Callout variant="note">
        The model is untrained, so sequences are gibberish — the loop mechanics are the lesson. One
        seed = one deterministic story: “Reroll” changes the seed, and the whole run replays
        identically from it.
      </Callout>
    </div>
  )
}
