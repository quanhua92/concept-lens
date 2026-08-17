import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Callout, Formula, Toggle } from '@/components/ui'
import { HeatmapGrid, HeatmapLegend } from '@/components/viz'
import { applyMask, causalMask, initAttentionWeights, initEmbeddings, matmul, scaleMat, softmaxRows, transpose } from '@/lib/math'
import { TOKENS } from '../lib'

export default function MaskChapter() {
  const x = useMemo(() => initEmbeddings(21, TOKENS.length, 8), [])
  const w = useMemo(() => initAttentionWeights(77, 8), [])
  const [causal, setCausal] = useState(true)

  const scores = useMemo(() => scaleMat(matmul(matmul(x, w.wq), transpose(matmul(x, w.wk))), 1 / Math.sqrt(8)), [x, w])
  const masked = useMemo(() => (causal ? applyMask(scores, causalMask(TOKENS.length)) : scores), [scores, causal])
  const attn = useMemo(() => softmaxRows(masked), [masked])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        A language model trains by predicting the next token — so at position <em>i</em>, it must
        only ever attend to positions ≤ i. Peeking ahead would be cheating: the answer is literally
        in the next position. The <strong className="text-zinc-100">causal mask</strong> enforces
        this by setting future scores to −∞ before the softmax.
      </p>

      <Formula caption="Masked scores: future positions get −∞, so after softmax they carry exactly 0 probability. The lower triangle is everything the model is allowed to see.">
        A = softmax(S + mask),&emsp;mask[i][j] = 0 if j ≤ i else −∞
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 max-w-sm">
          <Toggle
            label="Causal mask"
            checked={causal}
            onChange={setCausal}
            hint={causal ? 'On: each row only sees itself and the past.' : 'Off: every token sees every token — training signal leaks from the future.'}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={String(causal)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="mb-2 text-xs text-dim">
              attention weights A — {causal ? 'upper triangle is exactly zero' : 'bidirectional: future leaks in'}
            </p>
            <HeatmapGrid
              values={attn}
              rowLabels={TOKENS}
              colLabels={TOKENS}
              ariaLabel="attention weights with or without causal mask"
            />
            <div className="mt-3">
              <HeatmapLegend />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 rounded-xl border border-line bg-panel-2 p-4 font-mono text-xs leading-relaxed text-mute">
          <p>
            row “sat” (i=2) attends to:{' '}
            {causal ? (
              <span className="text-good">the, cat, sat — and nothing else (cols 3–5 are −∞ → 0)</span>
            ) : (
              <span className="text-bad">all six tokens, including “on the mat” — the future</span>
            )}
          </p>
          <p className="mt-1.5">
            row sum check:{' '}
            {attn[2].reduce((a, b) => a + b, 0).toFixed(4)} (always 1 — softmax renormalizes after masking)
          </p>
        </div>
      </div>

      <Callout variant="idea">
        −∞ is the elegant part: it survives addition to any score, and e<sup>−∞</sup> = 0, so
        masked positions drop out <em>before</em> softmax renormalizes. The visible probabilities
        still sum to exactly 1 — the mask re-weights, it doesn’t blank anything.
      </Callout>
      <Callout variant="note">
        Bidirectional attention (no mask) is not wrong — it’s what BERT-style encoders use, where
        the task is to fill in blanks, not predict the future. The mask is a statement about the{' '}
        <em>task</em>, not the math. The same trained trace here re-masks live from the same scores.
      </Callout>
    </div>
  )
}
