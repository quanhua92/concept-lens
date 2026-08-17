import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { fmtBytes } from '@/lib/format'
import { fmt } from '@/lib/utils'
import { QWEN_SERVE, serveConfigs, tokPerSec } from '../lib'

export default function ServingChapter() {
  const [context, setContext] = useState(4096)
  const [batch, setBatch] = useState(1)

  const configs = useMemo(() => serveConfigs(context, batch), [context, batch])
  const fitsIn24 = configs.map((c) => c.weightBytes + c.kvBytes <= QWEN_SERVE.gpuBytes)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Why bother with all that grid geometry? Because decode is bandwidth-bound (roofline
        concept): <strong className="text-zinc-100">halving the bytes doubles the tokens</strong>.
        Weight quantization shrinks the dominant read; KV quantization shrinks the growing one.
        The bars below are computed from the same division, live.
      </p>

      <Formula caption="tok/s = bandwidth ÷ (weight bytes + KV bytes). Qwen2.5-7B on a 4090 (1,008 GB/s); KV per token 57,344 B (halved when the cache is 8-bit).">
        tok/s = BW / (W + KV)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Slider label="context per sequence" value={context} min={512} max={32768} step={512} onChange={setContext} format={(v) => `${(v / 1024).toFixed(0)}k`} />
          <Slider label="batch size" value={batch} min={1} max={16} onChange={setBatch} format={(v) => `${v}`} hint="Total across the batch — the KV term multiplies." />
        </div>

        <div className="mt-6">
          <MemoryBar
            items={configs.map((c, i) => ({
              label: `${c.name} · weights + KV @ ${(context / 1024).toFixed(0)}k×${batch}`,
              bytes: c.weightBytes + c.kvBytes,
              color: c.color,
              sub: `${fmtBytes(c.weightBytes)} weights + ${fmtBytes(c.kvBytes)} KV ${fitsIn24[i] ? '' : '· exceeds 24 GB!'}`,
            }))}
            maxBytes={configs[0].weightBytes + configs[0].kvBytes}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {configs.map((c, i) => {
            const tps = tokPerSec(c.weightBytes, c.kvBytes)
            return (
              <div key={c.name} className="rounded-xl border border-line bg-panel-2 px-4 py-3">
                <p className="text-[11px] tracking-wide text-dim uppercase">{c.name}</p>
                <p className={`mt-1 font-mono text-xl ${fitsIn24[i] ? '' : 'text-dim line-through'}`}>{fmt(tps, 0)} tok/s</p>
                <p className="mt-0.5 font-mono text-[10px] text-dim">
                  {fmt(tps / tokPerSec(configs[0].weightBytes, configs[0].kvBytes), 2)}× FP16
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <Callout variant="idea">
        At batch 1 short context, 4-bit weights nearly double tok/s — the weight read dominates
        and W4 halves exactly it. Grow the context and the KV term takes over: that’s when cache
        quantization (last bar) pays. This is also the honest limit of the trick: quantization
        shrinks the <em>denominator</em> of the roofline division, nothing more.
      </Callout>
      <Callout variant="note">
        Idealized bandwidth model (same as roofline/tps chapters — real engines reach 70–85%).
        Weight-only formats (WxA16) dequantize on the fly inside fused kernels; quality costs
        aren’t shown here (the previous chapter’s grid geometry is that story — W4 with groups
        loses ~1 point on benchmarks, W8 nearly nothing).
      </Callout>
    </div>
  )
}
