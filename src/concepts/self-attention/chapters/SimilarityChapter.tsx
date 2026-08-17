import { useMemo, useState } from 'react'
import { Callout, Formula } from '@/components/ui'
import { BarVector, HeatmapGrid, HeatmapLegend } from '@/components/viz'
import { initEmbeddings } from '@/lib/math'
import { TOKENS, similarityMatrix } from '../lib'

export default function SimilarityChapter() {
  const emb = useMemo(() => initEmbeddings(21, TOKENS.length, 8), [])
  const scores = useMemo(() => similarityMatrix(emb, emb), [emb])
  const [row, setRow] = useState(1)
  const scale = useMemo(() => Math.max(...scores.flat().map(Math.abs)), [scores])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Attention starts with a question: <em>which earlier tokens matter to me right now?</em>{' '}
        Each token’s vector is compared against every other by a{' '}
        <strong className="text-zinc-100">dot product</strong> — one number per pair, positive when
        vectors align, negative when they oppose. This matrix is the raw material of attention.
      </p>

      <Formula caption="Similarity scores for 6 tokens. No scaling, no softmax yet — just geometry: dot products of the embedding rows.">
        S[i][j] = q<sub>i</sub> · k<sub>j</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <p className="mb-2 text-xs text-dim">
          raw similarity matrix — tap a row to see where that token “looks”
        </p>
        <HeatmapGrid
          values={scores}
          rowLabels={TOKENS}
          colLabels={TOKENS}
          highlightRow={row}
          onRowClick={setRow}
          scale={scale}
          ariaLabel="dot product similarity matrix between tokens"
        />
        <div className="mt-3">
          <HeatmapLegend />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs text-dim">
            scores for <span className="font-mono text-accent">“{TOKENS[row]}”</span> (row {row}) —
            signed, unbounded, not yet a probability
          </p>
          <BarVector values={scores[row]} maxAbs={scale} color="#f59e0b" />
        </div>
      </div>

      <Callout variant="idea">
        A dot product answers “how much do these two vectors agree?” — magnitude × alignment. Big
        positive = strong match, near zero = unrelated, negative = opposed. Everything attention
        does is built on turning this geometric table into choices.
      </Callout>
      <Callout variant="note">
        In a real transformer, q and k are not the raw embeddings — they are the embeddings passed
        through learned W<sub>Q</sub> and W<sub>K</sub> projections, so the model{' '}
        <em>learns</em> what “relevant” means. The geometry here (random embeddings) shows the
        mechanism, not learned semantics.
      </Callout>
    </div>
  )
}
