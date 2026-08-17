import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button, Callout, Formula, Toggle } from '@/components/ui'
import { BarVector, HeatmapGrid, HeatmapLegend } from '@/components/viz'
import { addMat, initEmbeddings, norm, randnMat, mulberry32, type Mat } from '@/lib/math'
import { fmt } from '@/lib/utils'

const TOKENS = ['the', 'cat', 'sat']
const D = 8
const LAYERS = 4
const TICK_MS = 1150

function buildStream(): { x0: Mat; deltas: Mat[] } {
  const x0 = initEmbeddings(42, TOKENS.length, D)
  const rng = mulberry32(1337)
  const deltas = Array.from({ length: LAYERS }, () => randnMat(rng, TOKENS.length, D, 0.35))
  return { x0, deltas }
}

export default function StreamChapter() {
  const { x0, deltas } = useMemo(buildStream, [])
  const reducedMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(!reducedMotion)
  const [showValues, setShowValues] = useState(false)
  const [focusRow, setFocusRow] = useState<number | null>(null)

  const maxStep = LAYERS * 2 + 1

  useEffect(() => {
    if (!playing || reducedMotion) return
    const id = setInterval(() => {
      setStep((s) => (s >= maxStep ? 0 : s + 1))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing, reducedMotion, maxStep])

  const layerIdx = Math.min(Math.floor(step / 2), LAYERS - 1)
  const isWrite = step % 2 === 1 && step < LAYERS * 2
  const isDone = step >= LAYERS * 2
  const applied = Math.max(0, Math.min(Math.ceil(step / 2), LAYERS))

  const stream = useMemo(() => {
    let x = x0
    for (let l = 0; l < applied; l++) x = addMat(x, deltas[l])
    return x
  }, [x0, deltas, applied])

  const scale = useMemo(
    () => Math.max(...stream.flat().map(Math.abs), ...deltas.flat().flat().map(Math.abs)) * 1.05,
    [stream, deltas],
  )

  const phaseLabel = isDone
    ? 'done — stream carries input + all writes'
    : isWrite
      ? `layer ${layerIdx + 1}: writing its delta into the stream`
      : `layer ${layerIdx + 1}: reading every row (Q·K·V)`

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Inside a transformer, a token is not a word that flows through a pipe. It is a{' '}
        <strong className="text-zinc-100">row of numbers</strong> — a vector of size{' '}
        <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-accent">d_model</code> —
        and all token vectors stacked together form the{' '}
        <strong className="text-zinc-100">residual stream</strong>: a shared memory bus. Every layer{' '}
        <span className="text-accent">reads</span> from it (to compute attention) and{' '}
        <span className="text-delta">writes</span> into it (by <em>adding</em> its output). The
        original embedding is never overwritten — it is always in there.
      </p>

      <Formula caption="The stream after L layers: the input plus the sum of every layer's write. Nothing is replaced, everything accumulates.">
        x<sup>(L)</sup> = x<sup>(0)</sup> + Δ<sub>1</sub> + Δ<sub>2</sub> + … + Δ<sub>L</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <motion.span
              key={phaseLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-xs"
              style={{ color: isWrite ? '#f59e0b' : '#22d3ee' }}
            >
              {phaseLabel}
            </motion.span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'pause animation' : 'play animation'}
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button
              onClick={() => {
                setPlaying(false)
                setStep((s) => Math.min(s + 1, maxStep))
              }}
              aria-label="step forward"
            >
              Step ›
            </Button>
            <Button
              onClick={() => {
                setPlaying(false)
                setStep(0)
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <p className="mb-2 text-xs text-dim">
              residual stream · 3 tokens × 8 dims — tap a token row to inspect it
            </p>
            <HeatmapGrid
              values={stream}
              rowLabels={TOKENS}
              colLabels={Array.from({ length: D }, (_, i) => `d${i}`)}
              highlightRow={focusRow}
              onRowClick={(i) => setFocusRow(focusRow === i ? null : i)}
              showValues={showValues}
              scale={scale}
              writeOverlay={isWrite ? deltas[layerIdx] : null}
              ariaLabel="residual stream heatmap, rows are tokens, columns are model dimensions"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <HeatmapLegend />
              <span className="inline-flex items-center gap-1.5 text-[11px] text-dim">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-delta" /> amber = layer writing
              </span>
            </div>
          </div>

          <div className="flex gap-2 sm:flex-col">
            {Array.from({ length: LAYERS }, (_, i) => {
              const state = applied > i || (applied === i && isWrite) ? 'writing' : applied > i ? 'done' : 'waiting'
              const active = i === layerIdx && !isDone
              return (
                <motion.div
                  key={i}
                  animate={{
                    borderColor: active ? (isWrite ? '#f59e0b' : '#22d3ee') : '#26262e',
                    scale: active ? 1.03 : 1,
                  }}
                  className="flex min-w-24 flex-1 items-center justify-between gap-2 rounded-xl border bg-panel-2 px-3 py-2.5 sm:flex-none"
                >
                  <span className="font-mono text-xs text-zinc-300">L{i + 1}</span>
                  <span
                    className="text-[10px] tracking-wide uppercase"
                    style={{ color: state === 'writing' ? '#f59e0b' : active ? '#22d3ee' : '#71717a' }}
                  >
                    {active ? (isWrite ? 'write' : 'read') : i < applied ? 'done' : 'idle'}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle label="Show numbers" checked={showValues} onChange={setShowValues} color="good" />
          <div className="flex items-center gap-2 rounded-xl border border-line bg-panel-2 px-4 py-3">
            <span className="text-xs text-dim">row norms</span>
            {TOKENS.map((t, i) => (
              <span key={t} className="font-mono text-xs text-accent">
                {t} {fmt(norm(stream[i]))}
              </span>
            ))}
          </div>
        </div>

        {focusRow !== null ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 overflow-hidden"
          >
            <p className="mb-2 text-xs text-dim">
              stream row for <span className="text-accent font-mono">“{TOKENS[focusRow]}”</span> —
              embedding + every write so far
            </p>
            <BarVector values={stream[focusRow]} maxAbs={scale} color="#22d3ee" />
          </motion.div>
        ) : null}
      </div>

      <Callout variant="idea">
        A useful mental model: the stream is a{' '}
        <strong className="text-zinc-100">shared whiteboard</strong>. Embeddings write the first
        draft. Each attention layer reads the whole board and adds a note. Layer 40 can still read
        what the embeddings wrote in layer 0 — nothing gets erased.
      </Callout>
      <Callout variant="note">
        This diagram uses a tiny toy stream (3 tokens × 8 dims) with random layer writes. Real
        models like GPT-style transformers use thousands of tokens and d_model of 768–16k, but the
        structure is identical: one stream, many additive readers and writers.
      </Callout>
    </div>
  )
}
