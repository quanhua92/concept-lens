import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl } from '@/components/ui'
import { HeatmapGrid } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { TOKENS, useHeadRun } from '../lib'

export default function ShapeChapter() {
  const [nHeads, setNHeads] = useState(4)
  const { heads } = useHeadRun(58, nHeads)
  const d = 8
  const dh = d / nHeads

  const steps = useMemo(
    () => [
      { label: 'stream', shape: `(${TOKENS.length}, ${d})`, note: '6 tokens × 8 dims' },
      { label: 'Q/K/V', shape: `(${TOKENS.length}, ${d})`, note: 'project once — same total compute at any head count' },
      { label: 'split', shape: `(${nHeads}, ${TOKENS.length}, ${dh})`, note: `view, not copy: ${nHeads} heads × ${dh} dims each` },
      { label: 'attend', shape: `(${nHeads}, ${TOKENS.length}, ${dh})`, note: 'each head: scores → softmax → ·Vₕ (scaled by √dh now!)' },
      { label: 'concat', shape: `(${TOKENS.length}, ${d})`, note: 'stack head outputs back into one wide matrix' },
      { label: '·W_O', shape: `(${TOKENS.length}, ${d})`, note: 'learned mixing of the committee' },
    ],
    [nHeads, dh],
  )

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        How do multiple heads fit in the same memory? They don’t take more — the d=8 stream is{' '}
        <em>viewed</em> as H slices of d/H dims. Q/K/V projections stay d×d; the only thing the
        head count changes is how the similarity computation is partitioned.
      </p>

      <Formula caption="Same parameter count at every H: W_Q, W_K, W_V, W_O are d×d regardless. Fewer heads → wider, higher-resolution heads; more heads → narrower, more specialized ones.">
        (S, d) → view (S, H, d/H) → attend per head → concat (S, d) → ·W<sub>O</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5">
          <SegmentedControl
            options={[1, 2, 4, 8].map((h) => ({ value: String(h), label: `${h} head${h > 1 ? 's' : ''}` }))}
            value={String(nHeads)}
            onChange={(v) => setNHeads(Number(v))}
            ariaLabel="head count"
          />
        </div>

        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li
              key={s.label}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-panel-2 px-4 py-2.5"
            >
              <span className="font-mono text-[10px] text-dim">{i + 1}</span>
              <span className="text-sm text-zinc-100">{s.label}</span>
              <span className="rounded bg-ink px-2 py-0.5 font-mono text-xs text-accent">{s.shape}</span>
              <span className="w-full text-xs text-dim sm:w-auto">{s.note}</span>
            </li>
          ))}
        </ol>

        <div className={`mt-6 grid gap-4 ${nHeads === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {heads.slice(0, 8).map((h) => (
            <div key={h.index}>
              <p className="mb-1.5 font-mono text-[10px] text-dim">
                head {h.index + 1} · dₕ={dh} · √dₕ={fmt(Math.sqrt(dh), 2)}
              </p>
              <HeatmapGrid values={h.attn} rowLabels={TOKENS} colLabels={TOKENS} ariaLabel={`head ${h.index + 1}`} />
              <p className="mt-1 font-mono text-[10px] text-dim">
                last-row entropy: {fmt(h.entropy, 2)} bits (max {fmt(Math.log2(TOKENS.length), 1)})
              </p>
            </div>
          ))}
        </div>
      </div>

      <Callout variant="idea">
        Note the scale factor follows the head width: each head scales by 1/√(d/H), not 1/√d. At
        H=8 on d=8, each head is a 1-dimensional similarity — a single score — which is why very
        narrow heads become blunt instruments.
      </Callout>
      <Callout variant="note">
        Qwen2.5-7B runs d=3584 with 28 heads → dₕ=128 per head — 16× wider than this demo, same
        shapes end to end. Real implementations fuse the split into one batched matmul
        (S,H,D→reshape), exactly the view trick above.
      </Callout>
    </div>
  )
}
