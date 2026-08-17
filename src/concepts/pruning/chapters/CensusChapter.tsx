import { useMemo } from 'react'
import { Callout, Formula } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { fmtBig } from '@/lib/format'
import { QWEN, census } from '../lib'

export default function CensusChapter() {
  const { rows, total } = useMemo(() => census(QWEN), [])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Before cutting anything, know where the parameters live. The census below is computed
        live from Qwen2.5-7B’s published config — attention (with GQA shrinking K/V), the MLP
        (three matrices), embeddings, and the output head. The punchline arrives by itself:{' '}
        <strong className="text-zinc-100">~89% of a dense transformer is MLP</strong>.
      </p>

      <Formula caption="Per layer: attention = 2d² (Q, O) + 2d·H_kv·d_h (K, V — GQA); MLP = 3·d·ffn (gate, up, down). Census runs on the real config.">
        P = L·(2d² + 2d·d<sub>kv</sub> + 3·d·ffn) + 2·V·d
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <MemoryBar
          items={rows.map((r) => ({
            label: r.label,
            bytes: r.params,
            color: r.color,
            sub: `${r.formula} · ${fmtBig(r.params)}`,
          }))}
          maxBytes={Math.max(...rows.map((r) => r.params))}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="computed total" value={fmtBig(total)} tone="good" sub="model card: 7.62B ✓" />
          <Stat label="MLP share" value={`${((rows[1].params / total) * 100).toFixed(1)}%`} sub="the pruning target" />
          <Stat label="K/V share of attention" value={`${((2 * QWEN.dModel * QWEN.kvHeads * QWEN.headDim) / rows[0].params * 100).toFixed(0)}%`} sub="GQA already shrank it 7×" />
        </div>
      </div>

      <Callout variant="idea">
        Structure dictates strategy: width pruning (shrinking ffn) attacks the 89%; depth pruning
        (dropping whole layers) removes ~233M per layer removed; head pruning trims attention —
        the smallest pot. Every pruning method is a search over <em>which of these parameters are
        redundant</em>.
      </Callout>
      <Callout variant="note">
        Constants: vocab 151,936; d=3584; 28 layers; 28 Q heads / 4 KV heads × 128; ffn 18,944;
        untied LM head — official Qwen2.5-7B config.json. The 7.62B total emerges from the
        arithmetic, matching the model card.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
