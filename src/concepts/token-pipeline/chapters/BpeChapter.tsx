import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { applyBPEGrouped, CORPUS, TEST_PHRASE, preTokenize, trainBPE } from '../lib'

const MAX_MERGES = 16

function display(t: string): string {
  return t.replace(/ /g, '␣')
}

export default function BpeChapter() {
  const merges = useMemo(() => trainBPE(CORPUS, MAX_MERGES), [])
  const [limit, setLimit] = useState(0)
  const preTokens = useMemo(() => preTokenize(TEST_PHRASE), [])
  const groups = useMemo(() => applyBPEGrouped(TEST_PHRASE, merges, limit), [merges, limit])
  const nPieces = groups.reduce((s, g) => s + g.length, 0)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Before a model sees text, the text must become numbers — but not word-by-word, and not
        straight from raw characters. Real tokenizers (GPT-2, Qwen) first run a{' '}
        <strong className="text-zinc-100">pre-tokenizer regex</strong> that splits text into pieces:
        contractions, words with their leading space, numbers, punctuation. Then{' '}
        <strong className="text-zinc-100">byte-pair encoding (BPE)</strong> learns merges — but
        <em> only inside each piece</em>. Both steps run live below, in your browser.
      </p>

      <Formula caption="The GPT-2 pre-tokenizer, evaluated left to right: contractions | letters (with optional leading space) | digits | punctuation | whitespace runs.">
        's|'t|'re|'ve|'m|'ll|'d| ?L+| ?N+| ?other+|\s+
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <p className="mb-3 text-xs text-dim">
          <span className="font-mono text-zinc-300">“{TEST_PHRASE}”</span>
        </p>

        <div>
          <p className="mb-2 text-xs text-dim">
            1 · pre-tokenize — the regex decides the boundaries merges can never cross
          </p>
          <div className="flex flex-wrap gap-2">
            {preTokens.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 font-mono text-xs text-zinc-300"
              >
                {display(t)}
              </span>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim">
            {preTokens.length} pre-tokens · “␣” = the leading space stays attached to its word ·
            “'s” is its own piece · “.” never merges with “mat”
          </p>
        </div>

        <div className="mt-6">
          <Slider
            label="merge steps applied"
            value={limit}
            min={0}
            max={merges.length}
            onChange={setLimit}
            format={(v) => `${v} / ${merges.length}`}
            hint="Each step bakes in one more learned merge — pieces shrink, but never across pre-token boundaries."
          />
        </div>

        <div className="mt-4">
          <p className="mb-3 text-xs text-dim">
            2 · BPE pieces within each pre-token — {nPieces} tokens total
          </p>
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {groups.map((g, gi) => (
              <div key={gi} className="flex flex-wrap items-center gap-1 rounded-lg border border-line/70 bg-panel-2/50 p-1.5">
                {g.map((t, i) => (
                  <motion.span
                    key={`${t}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-md bg-panel-2 px-2 py-1 font-mono text-xs text-accent"
                  >
                    {display(t)}
                  </motion.span>
                ))}
              </div>
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
                  {display(m.pair[0])} + {display(m.pair[1])}
                </span>
                <span>→</span>
                <span className={i < limit ? 'text-accent' : ''}>{display(m.merged)}</span>
                <span className="ml-auto opacity-60">×{m.count}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Callout variant="idea">
        Why the regex matters: without it, BPE would happily merge across word boundaries —
        “mat” + “.” into “mat.” or a word with an adjacent quote — creating thousands of
        once-used tokens. Pre-tokenization forces merges to stay inside one structural bucket:
        word-stuff with word-stuff, punctuation with punctuation, digits with digits.
      </Callout>
      <Callout variant="note">
        This trainer runs the exact GPT-2 pattern ({' '}<code className="font-mono text-[11px]">new RegExp(…, 'gu')</code>{' '} with
        Unicode categories) on characters. Production tokenizers apply the same pattern but then
        encode each piece as <em>bytes</em>, so any string — emoji, Vietnamese, code — tokenizes
        with zero unknown tokens. Qwen’s tokenizer is this scheme with ~150k learned pieces.
      </Callout>
    </div>
  )
}
