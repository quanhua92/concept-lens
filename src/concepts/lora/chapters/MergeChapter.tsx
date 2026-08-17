import { useMemo, useState } from 'react'
import { Callout, Formula, Slider, Toggle } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { fmtBytes } from '@/lib/format'
import { loraAdapterParams } from '../lib'

export default function MergeChapter() {
  const [rank, setRank] = useState(16)
  const [merged, setMerged] = useState(true)

  const adapterBytes = loraAdapterParams(rank) * 2
  const qwenBytes = 7.62e9 * 2
  const fullFtBytes = qwenBytes * 4
  const loraTrainBytes = qwenBytes + (adapterBytes + adapterBytes * 2 * 2) / 1

  const items = useMemo(
    () =>
      merged
        ? [
            { label: 'serving: merged model', bytes: qwenBytes, color: '#22d3ee', sub: 'W + (α/r)BA folded in — byte-identical architecture, zero overhead' },
          ]
        : [
            { label: 'base weights (frozen)', bytes: qwenBytes, color: '#71717a', sub: 'unchanged, shared across every task' },
            { label: `adapter r=${rank}`, bytes: adapterBytes, color: '#f59e0b', sub: `trainable, swappable, ${fmtBytes(adapterBytes)}` },
          ],
    [merged, qwenBytes, adapterBytes, rank],
  )

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The endgame of LoRA is what happens <em>after</em> training. Because the update is just a
        matrix of the same shape as W, you add it in once and delete the adapter: the served model
        has the same architecture, same latency, same memory as the base. Or keep the adapter
        separate and hot-swap tasks on a shared base.
      </p>

      <Formula caption="Merge is one addition per weight at load time. Un-merge (swap tasks) is one subtraction — adapters compose by addition too.">
        W<sub>served</sub> = W + (α/r)·B·A
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider
            label="adapter rank r"
            value={rank}
            min={1}
            max={64}
            onChange={setRank}
            format={(v) => `${v}`}
            hint="Even r=64 is a rounding error against the base model."
          />
          <div className="flex items-end">
            <Toggle label="merged for serving" checked={merged} onChange={setMerged} color={merged ? 'good' : 'delta'} />
          </div>
        </div>

        <div className="mt-6">
          <MemoryBar items={items} />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">training-time memory footprint (FP16 weights, Adam states = 2× trainable params)</p>
          <MemoryBar
            items={[
              { label: 'full fine-tune', bytes: fullFtBytes, color: '#fb7185', sub: 'weights + grads + Adam states for 7.6B params ≈ 61 GB' },
              { label: `LoRA r=${rank}`, bytes: loraTrainBytes, color: '#34d399', sub: `frozen weights + ${fmtBytes(adapterBytes)} adapter + its optimizer states` },
            ]}
            maxBytes={fullFtBytes}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="adapter size on disk" value={fmtBytes(adapterBytes)} sub={`r=${rank}, all-linear targets`} />
          <Stat label="share of base model" value={`${((adapterBytes / qwenBytes) * 100).toFixed(2)}%`} tone="good" />
          <Stat label="serving overhead after merge" value="0" tone="good" sub="same kernels, same latency" />
        </div>
      </div>

      <Callout variant="idea">
        One base, many adapters: a 15 GB model plus fifty 80 MB adapters is fifty “models” for the
        price of two. This is why LoRA won fine-tuning — the economics, not just the science.
      </Callout>
      <Callout variant="note">
        Sizes are computed from Qwen2.5-7B’s config (28 layers, d=3584, GQA kv-dim 512, ffn
        18,944; all-linear targets). Full-FT memory assumes Adam’s two moment buffers; LoRA pays
        them only on adapter params. DoRA extends the idea by decomposing updates into magnitude
        + direction — same merge story.
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
