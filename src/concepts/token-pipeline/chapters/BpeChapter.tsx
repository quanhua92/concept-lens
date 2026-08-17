import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { applyBPE, CORPUS, TEST_PHRASE, trainBPE } from '../lib'

const MAX_MERGES = 14

export default function BpeChapter() {
  const merges = useMemo(() => trainBPE(CORPUS, MAX_MERGES), [])
  const [limit, setLimit] = useState(0)
  const tokens = useMemo(() => applyBPE(TEST_PHRASE, merges, limit), [merges, limit])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Before a model sees text, the text must become numbers. Real tokenizers don’t split on
        spaces — they use <strong className="text-zinc-100">byte-pair encoding (BPE)</strong>:
        start from single characters, then repeatedly merge the most frequent adjacent pair. Below,
        a real BPE trainer runs on a tiny corpus, in your browser, right now.
      </p>

      <Formula caption="Each round: count every adjacent pair across the corpus, merge the most frequent one, repeat. Frequent words become single tokens; rare ones stay as pieces.">
        tokens ← repeat(max-frequency-pair-merge)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="merge steps applied"
          value={limit}
          min={0}
          max={merges.length}
          onChange={setLimit}
          format={(v) => `${v} / ${merges.length}`}
          hint="Each step bakes in one more learned merge — watch the phrase break into fewer, larger tokens."
        />

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">
            <span className="font-mono text-zinc-300">“{TEST_PHRASE}”</span> →{' '}
            {tokens.length} tokens
          </p>
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {tokens.map((t, i) => (
              <motion.span
                key={`${t}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 font-mono text-xs text-accent"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs text-dim">learned merges (best first)</p>
          <ol className="space-y-1.5">
            {merges.map((m, i) => (
              <li
                key={m.merged + i}
                className={`flex items-center gap-3 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                  i < limit ? 'bg-accent/10 text-zinc-100' : 'text-dim'
                }`}
              >
                <span className="w-6 text-right opacity-60">{i + 1}</span>
                <span className={i < limit ? 'text-delta' : ''}>
                  {m.pair[0]} + {m.pair[1]}
                </span>
                <span>→</span>
                <span className={i < limit ? 'text-accent' : ''}>{m.merged}</span>
                <span className="ml-auto opacity-60">×{m.count}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Callout variant="idea">
        The merge table is the tokenizer’s entire “vocabulary of pieces”. GPT-style models learn
        tens of thousands of merges from terabytes of text; Qwen’s tokenizer ships ~150k pieces.
        Same algorithm as above — just more rounds on a bigger corpus.
      </Callout>
      <Callout variant="note">
        This trainer runs on whitespace-split words with a word-end marker. Production tokenizers
        (GPT-2, Qwen) operate on <em>bytes</em>, so any string — emoji, Vietnamese, code — can be
        tokenized without an unknown-token problem.
      </Callout>
    </div>
  )
}
