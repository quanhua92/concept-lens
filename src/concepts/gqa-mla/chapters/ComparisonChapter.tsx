import { useMemo, useState } from 'react'
import { Callout, Slider } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { fmtBytes } from '@/lib/format'
import { V3_DIMS, bytesFor, v3Variants } from '../lib'

export default function ComparisonChapter() {
  const [context, setContext] = useState(32768)
  const variants = useMemo(v3Variants, [])

  const items = variants
    .map((v) => ({
      label: v.name,
      bytes: bytesFor(v.kvElementsPerTokenPerLayer) * context,
      color: v.color,
      sub: `${v.note} · ${fmtBytes(bytesFor(v.kvElementsPerTokenPerLayer))}/token (61 layers, FP16)`,
    }))
    .sort((a, b) => b.bytes - a.bytes)

  const mha = items.find((i) => i.label.startsWith('MHA'))
  const mla = items.find((i) => i.label.startsWith('MLA'))

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        One chart, DeepSeek-V3’s real dimensions (128 heads × 128 dims × 61 layers), and every
        attention family on it. The trade each makes: MHA caches everything per head; GQA shares
        heads; MQA collapses to one; MLA compresses to a latent and keeps RoPE separate.
      </p>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="context length"
          value={context}
          min={1024}
          max={131072}
          step={1024}
          onChange={setContext}
          format={(v) => `${(v / 1024).toFixed(0)}k`}
          hint="DeepSeek-V3 supports 128k — slide there and compare."
        />

        <div className="mt-6">
          <MemoryBar items={items} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label={`MHA @ ${(context / 1024).toFixed(0)}k`}
            value={fmtBytes(mha?.bytes ?? 0)}
            tone="bad"
            sub="untenable at long context"
          />
          <Stat
            label={`MLA @ ${(context / 1024).toFixed(0)}k`}
            value={fmtBytes(mla?.bytes ?? 0)}
            tone="good"
            sub={`${((mha?.bytes ?? 1) / (mla?.bytes ?? 1)).toFixed(0)}× smaller than MHA`}
          />
          <Stat
            label="quality ordering"
            value="MLA ≈ MHA"
            sub="GQA(8) ≈ MHA−1% · MQA degrades"
          />
        </div>
      </div>

      <Callout variant="idea">
        MLA dominates the trade-off space because it attacks the{' '}
        <em>representation</em>, not the head count: quality depends on the latent capturing what
        attention needs, and 512 learned dims proved sufficient. The cost moved from memory into
        engineering: absorbed matrices and custom kernels.
      </Callout>
      <Callout variant="note">
        Bytes use FP16 for all variants for apples-to-apples. DeepSeek-V3 actually stores some
        caches in FP8, halving its bars. GQA quality figure from Ainslie et al.; MLA parity from
        DeepSeek-V2 ablations. {V3_DIMS.heads} heads · {V3_DIMS.layers} layers are cited constants;
        every bar is computed from them.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-zinc-100'}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
