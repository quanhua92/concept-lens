import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import {
  CORPUS,
  PRESETS,
  TEST_PHRASE,
  analyzeInput,
  applyBPEGrouped,
  displayToken,
  encodeSymbols,
  preTokenize,
  symbolName,
  trainBPE,
} from '../lib'

const MAX_MERGES = 16

function display(t: string): string {
  return t.replace(/ /g, '␣')
}

export default function BpeChapter() {
  const merges = useMemo(() => trainBPE(CORPUS, MAX_MERGES), [])
  const [text, setText] = useState(TEST_PHRASE)
  const [vocabMerges, setVocabMerges] = useState(MAX_MERGES)
  const preTokens = useMemo(() => preTokenize(text), [text])
  const byteGroups = useMemo(() => preTokens.map((p) => encodeSymbols(p)), [preTokens])
  const groups = useMemo(() => applyBPEGrouped(text, merges, vocabMerges), [text, merges, vocabMerges])
  const analysis = useMemo(() => analyzeInput(text, merges, vocabMerges), [text, merges, vocabMerges])
  const currentTokens = useMemo(() => new Set(groups.flat()), [groups])
  const pieceRank = useMemo(() => {
    const map = new Map<string, number>()
    merges.forEach((m, i) => {
      if (!map.has(m.merged)) map.set(m.merged, i)
    })
    return map
  }, [merges])
  const anyInUse = merges.slice(0, vocabMerges).some((m) => currentTokens.has(m.merged))

  const nTokens = groups.reduce((s, g) => s + g.length, 0)
  const nBytes = byteGroups.reduce((s, g) => s + g.length, 0)
  const exploded = groups.filter((g) => g.length > 1).length

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        When a model ships, its tokenizer ships with it — a{' '}
        <strong className="text-zinc-100">frozen merge table</strong>, learned once during training
        and never touched again. Every request you send runs the same three steps: regex-split,
        encode to bytes, apply learned merges in rank order. No training, no adaptation — the table
        below was frozen from a tiny corpus, and it is all the “vocabulary knowledge” this encoder
        will ever have. Everything runs live, on any text you give it.
      </p>

      <Formula caption="Encoding is inference: pre-tokenize → each piece becomes UTF-8 bytes (via GPT-2's byte-to-symbol map, Ġ = space) → merge loop applies the frozen ranks. Pieces whose pairs never made the table stay as bytes.">
        pieces = regex(text)&emsp;·&emsp;bytes = UTF8(piece)&emsp;·&emsp;merge(frozen ranks)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <label htmlFor="bpe-input" className="mb-2 block text-xs text-dim">
          text to encode — try your own
        </label>
        <input
          id="bpe-input"
          type="text"
          value={text}
          maxLength={120}
          onChange={(e) => setText(e.target.value)}
          placeholder="type something…"
          className="h-11 w-full rounded-xl border border-line bg-panel-2 px-4 font-mono text-sm text-zinc-100 placeholder:text-dim focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="preset texts">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setText(p.text)}
              title={p.note}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                text === p.text
                  ? 'border-accent bg-accent/10 font-medium text-accent'
                  : 'border-line text-mute hover:border-zinc-600 hover:text-zinc-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
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
            {preTokens.length === 0 ? (
              <span className="text-xs text-dim">— type or pick a preset above —</span>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs text-dim">
            2 · byte-encode — every piece becomes UTF-8 bytes; shown as the vocab’s symbol alphabet
            (space byte = Ġ, rendered ␣ below; newline = Ċ). Multi-byte chars become several
            symbols. Nothing is ever “unknown”.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {byteGroups.map((g, gi) => (
              <span
                key={gi}
                className="flex items-baseline gap-2 rounded-lg border border-line/70 bg-panel-2/50 px-2.5 py-1.5 font-mono text-xs"
                title={g.join('·')}
              >
                <span className="text-zinc-300">{display(preTokens[gi])}</span>
                <span className="text-dim">{g.map((s) => symbolName(s)).join('·')}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim">
            {preTokens.length} pre-token{preTokens.length === 1 ? '' : 's'} ·{' '}
            {nBytes} byte{nBytes === 1 ? '' : 's'} · {text.length} character
            {text.length === 1 ? '' : 's'}
            {nBytes !== text.length ? ' (multi-byte chars ahead)' : ''}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-dim">
            “␣cat” is one token <em>containing</em> its leading space. GPT-2 wants word-with-space
            (mid-sentence) and bare word (as in “concatenate”) to be different tokens: the leading
            space is signal, not noise — Ġ is just how the vocab file writes it.
          </p>
        </div>

        <div className="mt-6">
          <Slider
            label="vocab size — learned merges in the frozen table"
            value={vocabMerges}
            min={0}
            max={merges.length}
            onChange={setVocabMerges}
            format={(v) => `256 + ${v} = ${256 + v}`}
            hint="Merges only combine byte pieces within a pre-token — never split, never cross boundaries. At 0 the encoder is a pure byte-level model."
          />
        </div>

        <div className="mt-4">
          <p className="mb-3 text-xs text-dim">3 · merge loop — frozen ranks applied in order</p>
          <div className="flex flex-wrap gap-2" aria-live="polite">
            {groups.map((g, gi) => (
              <div
                key={gi}
                className={`flex flex-wrap items-center gap-1 rounded-lg border p-1.5 ${
                  g.length > 1 ? 'border-delta/40 bg-delta/5' : 'border-line/70 bg-panel-2/50'
                }`}
              >
                {g.map((t, i) => (
                  <motion.span
                    key={`${t}-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-md bg-panel-2 px-2 py-1 font-mono text-xs text-accent"
                    title={t}
                  >
                    {displayToken(t)}
                  </motion.span>
                ))}
                {g.length > 1 ? (
                  <span className="px-1 font-mono text-[10px] whitespace-nowrap text-delta">
                    → {g.length} tokens
                  </span>
                ) : null}
              </div>
            ))}
            {groups.length === 0 ? <span className="text-xs text-dim">nothing to encode</span> : null}
          </div>
          {preTokens.length > 0 ? (
            <p className="mt-3 font-mono text-[11px] text-dim">
              {nBytes} byte-pieces →{' '}
              <span className="text-zinc-300">
                {nTokens} token{nTokens === 1 ? '' : 's'}
              </span>
              {analysis.firingMerges.length > 0 ? (
                <>
                  {' '}
                  · <span className="text-good">{analysis.firingMerges.length} rank</span>{' '}
                  {analysis.firingMerges.length === 1 ? 'fired' : 'ranks fired'}
                </>
              ) : (
                <> · no learned rank covers this text — it stays bytes</>
              )}
              {exploded > 0 ? (
                <>
                  {' '}
                  · <span className="text-delta">{exploded} exploded</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs text-dim">
            frozen vocabulary — 256 byte-pieces +{' '}
            <span className="text-zinc-300">{vocabMerges} learned pieces</span>. Each merge rank
            adds exactly one new piece; drag the slider above and watch the vocab grow.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {merges.slice(0, vocabMerges).map((m, i) => {
              const inUse = currentTokens.has(m.merged)
              return (
                <motion.span
                  key={m.merged + i}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  title={`rank ${i + 1}: ${displayToken(m.pair[0])} + ${displayToken(m.pair[1])} · seen ×${m.count} in training`}
                  className={`rounded-md border px-2 py-1 font-mono text-xs ${
                    inUse
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-line bg-panel-2 text-zinc-300'
                  }`}
                >
                  {displayToken(m.merged)}
                  <sub className="ml-0.5 text-[9px] text-dim">{i + 1}</sub>
                </motion.span>
              )
            })}
            {vocabMerges === 0 ? (
              <span className="text-xs text-dim">byte-only vocab — 256 pieces, no merges</span>
            ) : null}
          </div>
          {anyInUse ? (
            <p className="mt-2 text-[11px] text-dim">
              <span className="text-accent">accented</span> = pieces your text actually used
            </p>
          ) : null}

          <p className="mt-5 mb-2 text-xs text-dim">
            how pieces compose — a merge can build on an earlier merge’s piece
          </p>
          <ol className="space-y-1.5">
            {merges.slice(0, vocabMerges).map((m, i) => {
              const refs: { side: string; rank: number }[] = []
              for (const side of m.pair) {
                const r = pieceRank.get(side)
                if (r !== undefined && r < i) refs.push({ side, rank: r + 1 })
              }
              return (
                <li
                  key={m.merged + i}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-300"
                >
                  <span className="w-6 text-right text-dim">{i + 1}</span>
                  <span className="text-delta">
                    {displayToken(m.pair[0])} + {displayToken(m.pair[1])}
                  </span>
                  <span className="text-dim">→</span>
                  <span className="text-accent">{displayToken(m.merged)}</span>
                  {refs.length > 0 ? (
                    <span className="text-[10px] text-good">
                      ({refs.map((r) => `${displayToken(r.side)} = rank ${r.rank}`).join(', ')})
                    </span>
                  ) : (
                    <span className="text-[10px] text-dim">(raw bytes)</span>
                  )}
                  <span className="ml-auto text-[10px] text-dim">×{m.count} in training</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <Callout variant="idea">
        This is the real inference picture: <strong className="text-zinc-100">frequency is frozen
        into the table</strong>. A pair that occurred often in training data (like `t+he`) is a
        cheap single token forever; a pair that never did (`w+o` in a word the corpus never saw)
        stays raw bytes forever. That’s why rare words, emoji chains, and non-English text cost more
        tokens — their bytes simply never earned ranks in this table. The amber badges mark exactly
        those gaps.
      </Callout>
      <Callout variant="note">
        Byte-exact GPT-2 mechanics: the same pre-tokenizer regex, the same{' '}
        <code className="font-mono text-[11px]">bytes_to_unicode</code> mapping (Ġ = space, 😀 =
        ðŁĺĢ), and rank-ordered merging — what tiktoken-style encoders run, up to scale. The
        difference is purely scale: this table has {MAX_MERGES} ranks from six sentences; GPT-2’s
        has 50k, Qwen’s ~150k, learned from trillions of tokens — which is why their tables cover
        your “world” and this one doesn’t.
      </Callout>
    </div>
  )
}
