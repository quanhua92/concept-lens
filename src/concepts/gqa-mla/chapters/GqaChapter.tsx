import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { qToKvGroup } from '../lib'

const Q_HEADS = 28

export default function GqaChapter() {
  const [kvHeads, setKvHeads] = useState(28)
  const groups = useMemo(() => qToKvGroup(Q_HEADS, kvHeads), [kvHeads])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Multi-head attention gives every query head its own K and V — and pays for it in cache
        memory. The fix family: <strong className="text-zinc-100">share</strong>. MQA (one KV head
        for everyone) is maximal sharing; GQA (grouped-query attention) lets each KV head serve a{' '}
        <em>group</em> of query heads — nearly MHA quality at a fraction of the cache. Qwen2.5-7B
        ships 28 query heads over just 4 KV heads.
      </p>

      <Formula caption="Each KV head is computed once per token and read by every query head in its group. Cache cost scales with KV heads only.">
        K<sub>kv</sub> per token per layer = 2 · H<sub>kv</sub> · d<sub>h</sub> elements
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label={`KV heads (of ${Q_HEADS} query heads)`}
          value={kvHeads}
          min={1}
          max={28}
          onChange={setKvHeads}
          format={(v) => `${v}`}
          hint="28 = MHA · 4 = Qwen2.5-7B · 1 = MQA"
        />

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">
            which query heads share which KV head (group size {Math.ceil(Q_HEADS / kvHeads)})
          </p>
          <div className="space-y-2">
            {groups.map((heads, gi) => (
              <div key={gi} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 w-16 shrink-0 text-right font-mono text-[10px] text-delta">
                  KV {gi + 1}
                </span>
                {heads.map((q) => (
                  <motion.span
                    key={q}
                    layout
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-delta/40 bg-delta/10 font-mono text-[10px] text-zinc-200"
                    title={`query head ${q + 1}`}
                  >
                    {q + 1}
                  </motion.span>
                ))}
              </div>
            ))}
            {kvHeads > 8 ? (
              <p className="mt-1 text-xs text-dim">…{groups.length} rows total (MHA territory)</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <MemoryBar
            items={[
              {
                label: `KV cache · ${kvHeads} kv-heads, 32k ctx`,
                bytes: 2 * kvHeads * 128 * 28 * 32768 * 2,
                color: kvHeads <= 4 ? '#34d399' : kvHeads <= 8 ? '#f59e0b' : '#fb7185',
                sub: `${(2 * kvHeads * 128 * 28 * 2 / 1024).toFixed(0)} KB per token — Qwen2.5-7B dims (28 layers)`,
              },
            ]}
          />
        </div>
      </div>

      <Callout variant="idea">
        GQA is a <em>knob</em>, not a new mechanism: the attention math per (query head, KV head)
        pair is unchanged — only the K/V wiring changes. That’s why it retrains from an MHA
        checkpoint cheaply (the GQA paper initializes all groups from the original MHA heads).
      </Callout>
      <Callout variant="note">
        Ainslie et al. (2023) found GQA with groups of 8 keeps quality within ~1% of MHA while
        cutting cache 8×, and clearly beats MQA — hence the industry default. The bars above use
        Qwen2.5-7B’s real 28-layer config at 32k context, FP16.
      </Callout>
    </div>
  )
}
