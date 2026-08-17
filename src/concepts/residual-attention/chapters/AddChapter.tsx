import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Callout, Formula, SegmentedControl, Slider, Toggle } from '@/components/ui'
import { BarVector, HeatmapGrid, HeatmapLegend } from '@/components/viz'
import {
  addMat,
  initAttentionWeights,
  initEmbeddings,
  norm,
  scaleMat,
  singleHeadAttention,
  type Mat,
} from '@/lib/math'
import { fmt } from '@/lib/utils'

const TOKENS = ['the', 'cat', 'sat']
const STEPS = ['input', 'norm', 'attn', 'delta', 'add'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: { value: Step; label: string }[] = [
  { value: 'input', label: 'x' },
  { value: 'norm', label: 'LN(x)' },
  { value: 'attn', label: 'A' },
  { value: 'delta', label: 'Δ' },
  { value: 'add', label: 'x + Δ' },
]

export default function AddChapter() {
  const x = useMemo(() => initEmbeddings(7, TOKENS.length, 8), [])
  const weights = useMemo(() => initAttentionWeights(99, 8), [])
  const trace = useMemo(() => singleHeadAttention(x, weights.wq, weights.wk, weights.wv), [x, weights])

  const [step, setStep] = useState<Step>('input')
  const [alpha, setAlpha] = useState(1)
  const [residual, setResidual] = useState(true)

  const scaledDelta = useMemo(() => scaleMat(trace.delta, alpha), [trace, alpha])
  const output = useMemo(
    () => (residual ? addMat(x, scaledDelta) : scaledDelta),
    [x, scaledDelta, residual],
  )

  const stepIndex = STEPS.indexOf(step)
  const scale = useMemo(
    () => Math.max(...x.flat().map(Math.abs), ...trace.delta.flat().map(Math.abs), 1e-9) * 1.05,
    [x, trace],
  )

  const normsBefore = x.map(norm)
  const normsAfter = output.map(norm)

  const captions: Record<Step, { title: string; body: string }> = {
    input: {
      title: 'The stream as it enters the block',
      body: 'Each row is a token’s current vector — the embedding plus everything earlier layers wrote. This is what the block reads.',
    },
    norm: {
      title: 'LayerNorm: standardize each row',
      body: 'Before attention, each token vector is normalized to zero mean and unit variance. This keeps the numbers well-behaved no matter how large the stream has grown.',
    },
    attn: {
      title: 'Attention: who talks to whom',
      body: 'Row i of A says where token i pulls information from. “cat” (row 1) might attend mostly to “the” and to itself. Each row sums to 1.',
    },
    delta: {
      title: 'The block produces a delta, not a new stream',
      body: 'Mixing value vectors with attention weights gives Δ — a proposed edit per token. Crucially, Δ is the same shape as the stream: it is an edit, written on top of what is already there.',
    },
    add: {
      title: residual ? 'The add: stream ← stream + Δ' : 'No residual: stream ← Δ (the input is discarded!)',
      body: residual
        ? 'The delta is added row-by-row. The embedding survives; the layer only nudges the stream. Δ is an increment, like a “track change” on a document.'
        : 'Without the residual path, the output is just Δ. Everything the embeddings and earlier layers wrote is erased. Depth becomes nearly impossible to train.',
    },
  }

  const mainViz = () => {
    switch (step) {
      case 'input':
        return <VizPanel title="stream x" values={x} scale={scale} />
      case 'norm':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <VizPanel title="x before LN" values={x} scale={scale} dimmed />
            <VizPanel title="LN(x)" values={trace.xNorm} scale={Math.max(...trace.xNorm.flat().map(Math.abs)) * 1.05} />
          </div>
        )
      case 'attn':
        return (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
            <div>
              <p className="mb-2 text-xs text-dim">attention weights A (rows = from, cols = to)</p>
              <HeatmapGrid
                values={trace.attn}
                rowLabels={TOKENS}
                colLabels={TOKENS}
                ariaLabel="attention weight matrix"
              />
              <div className="mt-3">
                <HeatmapLegend />
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-line bg-panel-2 p-4">
              {trace.attn.map((row, i) => (
                <BarVector
                  key={i}
                  values={row}
                  showIndexes={false}
                  color="#f59e0b"
                  maxAbs={1}
                  label={`attention from ${TOKENS[i]}`}
                />
              ))}
            </div>
          </div>
        )
      case 'delta':
        return (
          <div className="space-y-4">
            <VizPanel title={`Δ = A · V  (write strength α = ${fmt(alpha)})`} values={scaledDelta} scale={scale} amber />
            <Slider
              label="write strength α"
              value={alpha}
              min={0}
              max={2}
              step={0.05}
              onChange={setAlpha}
              format={(v) => `×${fmt(v)}`}
              hint="How hard this layer pushes on the stream. Real blocks typically make modest edits."
            />
          </div>
        )
      case 'add':
        return (
          <div className="space-y-4">
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <VizPanel title={residual ? 'x + αΔ' : 'αΔ alone'} values={output} scale={scale * 1.6} amber={!residual} />
              <div className="justify-self-center font-mono text-lg text-dim" aria-hidden>
                =
              </div>
              <div className="space-y-2 rounded-xl border border-line bg-panel-2 p-4">
                {TOKENS.map((t, i) => (
                  <p key={t} className="flex justify-between gap-4 font-mono text-xs">
                    <span className="text-dim">{t}</span>
                    <span>
                      <span className="text-zinc-300">{fmt(normsBefore[i])}</span>
                      <span className="text-dim"> → </span>
                      <span className={residual ? 'text-good' : 'text-bad'}>{fmt(normsAfter[i])}</span>
                    </span>
                  </p>
                ))}
              </div>
            </div>
            <Toggle
              label="Residual connection (x + Δ)"
              checked={residual}
              onChange={setResidual}
              color={residual ? 'good' : 'delta'}
              hint={
                residual
                  ? 'On: the block adds its delta to the stream.'
                  : 'Off: watch the row norms — the stream is replaced by the delta.'
              }
            />
          </div>
        )
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        A transformer block does not compute “the next representation”. It computes an{' '}
        <strong className="text-zinc-100">edit</strong> to the current one. Walk through one
        attention block below — the famous <em>Add</em> in “Add &amp; Norm” is where the magic
        happens.
      </p>

      <Formula caption="Pre-norm transformer block. Δ is the attention output; α is a stand-in for how strong the write is (in real blocks the magnitude is learned).">
        x′ = x + <span className="text-delta">α·Attn(LN(x))</span>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl options={STEP_LABELS} value={step} onChange={setStep} ariaLabel="pipeline step" />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const i = Math.max(0, stepIndex - 1)
                setStep(STEPS[i])
              }}
              disabled={stepIndex === 0}
              aria-label="previous step"
            >
              ‹ Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const i = Math.min(STEPS.length - 1, stepIndex + 1)
                setStep(STEPS[i])
              }}
              disabled={stepIndex === STEPS.length - 1}
            >
              Next ›
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step + String(residual)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-sm font-semibold text-zinc-100">{captions[step].title}</h3>
            <p className="mt-1 mb-5 max-w-2xl text-sm leading-relaxed text-mute">{captions[step].body}</p>
            {mainViz()}
          </motion.div>
        </AnimatePresence>
      </div>

      {step === 'add' && !residual ? (
        <Callout variant="warn">
          With the residual removed, the row norms collapse to the size of Δ alone — the embedding
          signal that took layer after layer to build is simply gone. Flip the toggle back on and
          watch the norms recover.
        </Callout>
      ) : (
        <Callout variant="idea">
          Because every block only <em>adds</em>, each layer can be as shallow or as aggressive as
          it needs to be — the stream keeps a stable core, and depth becomes composable. Next
          chapter: what happens across 40+ layers with and without that “+”.
        </Callout>
      )}
    </div>
  )
}

function VizPanel({
  title,
  values,
  scale,
  amber = false,
  dimmed = false,
}: {
  title: string
  values: Mat
  scale: number
  amber?: boolean
  dimmed?: boolean
}) {
  return (
    <div className={dimmed ? 'opacity-50' : ''}>
      <p className={`mb-2 font-mono text-xs ${amber ? 'text-delta' : 'text-dim'}`}>{title}</p>
      <HeatmapGrid
        values={values}
        rowLabels={TOKENS}
        colLabels={Array.from({ length: values[0].length }, (_, i) => `d${i}`)}
        scale={scale}
      />
    </div>
  )
}
