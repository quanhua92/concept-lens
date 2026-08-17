import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl } from '@/components/ui'
import { HeatmapGrid, HeatmapLegend, DistBars } from '@/components/viz'
import { VOCAB, lmForward, makeTinyLM, idsToTokens } from '../lib'

const SENTENCES = [
  [0, 1, 2],
  [0, 5, 6, 8, 9],
  [7, 13, 14, 1, 6],
  [0, 10, 11, 12],
]

export default function ForwardChapter() {
  const lm = useMemo(() => makeTinyLM(42), [])
  const [sentIdx, setSentIdx] = useState(0)
  const ids = SENTENCES[sentIdx]
  const { logits, attn, x } = useMemo(() => lmForward(lm, ids), [lm, ids])

  const top = useMemo(() => {
    const order = logits.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
    return order.slice(0, 8).map(([v, i]) => ({ v, i }))
  }, [logits])
  const best = top[0].i

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Token IDs go in; a probability for the <em>next</em> token comes out. In between: look up
        embeddings, run the stack of blocks, project to vocabulary-sized logits. Pick a sentence and
        follow its numbers through every stage — computed live with the same attention math from the
        earlier chapters.
      </p>

      <Formula caption="One forward pass. Logits come from the last position only — the model predicts exactly one next token.">
        ids → E[ids] → blocks → h_last → logits = W·h_last → softmax → P(next)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-dim">input sentence</p>
          <SegmentedControl
            options={SENTENCES.map((s, i) => ({ value: String(i), label: idsToTokens(s).slice(0, 2).join(' ') }))}
            value={String(sentIdx)}
            onChange={(v) => setSentIdx(Number(v))}
            ariaLabel="input sentence"
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs text-dim">1 · token ids from the vocabulary lookup</p>
            <div className="flex flex-wrap gap-2">
              {ids.map((id, i) => (
                <span key={i} className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 font-mono text-xs">
                  <span className="text-accent">{VOCAB[id]}</span>
                  <span className="ml-2 text-dim">#{id}</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-dim">2 · embedding rows ({ids.length} × 8) — the residual stream at layer 0</p>
            <HeatmapGrid
              values={x}
              rowLabels={idsToTokens(ids)}
              colLabels={Array.from({ length: 8 }, (_, i) => `d${i}`)}
              ariaLabel="embedding matrix"
            />
          </div>

          <div>
            <p className="mb-2 text-xs text-dim">3 · attention pattern over the {ids.length} positions (causal)</p>
            <HeatmapGrid values={attn} rowLabels={idsToTokens(ids)} colLabels={idsToTokens(ids)} ariaLabel="attention weights" />
            <div className="mt-3">
              <HeatmapLegend />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-dim">4 · logits → next-token distribution (top 8 shown)</p>
            <DistBars
              items={top.map(({ v, i }) => ({ label: VOCAB[i], p: Math.exp(v) / top.reduce((s, t) => s + Math.exp(t.v), 0), color: '#22d3ee' }))}
              highlight={top.findIndex((t) => t.i === best)}
              height={120}
            />
            <p className="mt-2 font-mono text-xs text-mute">
              argmax → <span className="text-delta">“{VOCAB[best]}”</span>
            </p>
          </div>
        </div>
      </div>

      <Callout variant="note">
        The weights here are random (untrained) — the argmax is meaningless. The point is the{' '}
        <em>plumbing</em>: shapes, lookups, and one scalar score per vocabulary entry. Training is
        what turns this random machinery into a predictor; everything you see stays identical.
      </Callout>
    </div>
  )
}
