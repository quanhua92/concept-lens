import { useMemo, useState } from 'react'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { MemoryBar } from '@/components/viz'
import { fmtBytes } from '@/lib/format'
import { QWEN7B, QWEN7B_MHA, QWEN7B_PARAMS, decodeTraffic, kvBytesPerToken, kvTotalBytes } from '../lib'

type Mode = 'prefill' | 'decode'

export default function PrefillDecodeChapter() {
  const [mode, setMode] = useState<Mode>('prefill')
  const [batch, setBatch] = useState(1)
  const [context, setContext] = useState(4096)

  const traffic = useMemo(
    () => decodeTraffic(QWEN7B_PARAMS, 2, QWEN7B, context),
    [context],
  )
  const perTokenKv = kvBytesPerToken(QWEN7B)
  const totalKv = kvTotalBytes(QWEN7B, context, batch)

  const intensity = useMemo(() => {
    const flopsPerToken = 2 * QWEN7B_PARAMS
    const bytesPerToken = traffic.weightBytes + traffic.kvBytes
    return flopsPerToken / bytesPerToken
  }, [traffic])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Serving splits into two phases with opposite personalities.{' '}
        <strong className="text-zinc-100">Prefill</strong> processes the whole prompt in one giant
        batched pass — huge matmuls, compute-bound. <strong className="text-zinc-100">Decode</strong>{' '}
        emits one token per step — tiny matmuls, but every weight byte and the entire KV cache must
        be read from memory. Arithmetic intensity decides which ceiling you hit.
      </p>

      <Formula caption="Intensity = FLOPs per byte moved. Prefill multiplies FLOPs by the prompt length while bytes stay ~fixed → compute-bound. Decode is one token against all weights → bandwidth-bound.">
        intensity = FLOPs/byte&emsp;·&emsp;prefill ≈ 2·P·L/prompt_bytes&emsp;·&emsp;decode ≈ 2·P/(P·b + KV)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: 'prefill', label: 'prefill' },
              { value: 'decode', label: 'decode' },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="serving phase"
          />
        </div>

        {mode === 'prefill' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-panel-2 p-4 text-sm leading-relaxed text-mute">
              All {context.toLocaleString()} prompt tokens flow through the model{' '}
              <em>together</em>. Each weight byte is loaded once and{' '}
              <span className="text-accent">reused {context.toLocaleString()} times</span> in big
              matrix-matrix multiplies — the GPU’s favorite shape. Per-token FLOPs are identical to
              decode; the bytes are amortized.
            </div>
            <Slider
              label="prompt length"
              value={context}
              min={256}
              max={32768}
              step={256}
              onChange={setContext}
              format={(v) => v.toLocaleString()}
              hint="Longer prompts amortize weight reads further — intensity grows linearly."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-panel-2 p-4 text-sm leading-relaxed text-mute">
              Each decode step processes <span className="text-delta">one token</span>. To produce
              it, the GPU reads <em>every</em> weight (≈14.2 GB in FP16) plus the KV cache — and
              does one thin matmul per layer. Arithmetic intensity:{' '}
              <span className="font-mono text-zinc-100">{intensity.toFixed(1)} FLOP/byte</span> —
              far below any GPU’s compute/bandwidth ratio.
            </div>
            <Slider
              label="batch size"
              value={batch}
              min={1}
              max={64}
              onChange={setBatch}
              format={(v) => `${v}`}
              hint="Batching is the fix: more sequences per step = more FLOPs per weight byte. (Roofline concept, serving track.)"
            />
          </div>
        )}

        <div className="mt-6">
          <MemoryBar
            items={[
              { label: 'weights (FP16)', bytes: traffic.weightBytes, color: '#71717a', sub: 'read every step — fixed cost' },
              { label: `KV cache · ${context.toLocaleString()} ctx × ${batch} seq`, bytes: totalKv, color: '#f59e0b', sub: `${fmtBytes(perTokenKv)} per token per sequence` },
            ]}
            maxBytes={Math.max(traffic.weightBytes, totalKv)}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="KV per token" value={fmtBytes(perTokenKv)} sub="2 × 28L × 4 kv-heads × 128d × 2B" />
          <Stat label="KV at max ctx (128k)" value={fmtBytes(kvTotalBytes(QWEN7B, 131072))} sub="one sequence!" tone="bad" />
          <Stat label="if it were MHA (28 kv-heads)" value={fmtBytes(kvTotalBytes(QWEN7B_MHA, 131072))} sub="7× worse — why GQA exists" tone="bad" />
        </div>
      </div>

      <Callout variant="idea">
        Decode speed is a <em>bandwidth</em> problem in disguise: tokens/second ≈ bandwidth ÷ bytes-read-per-token.
        That single division explains batching, GQA, MLA, and quantization — four concepts ahead.
      </Callout>
      <Callout variant="note">
        Constants: Qwen2.5-7B — 28 layers, 4 KV heads, 128 head dim (config.json), 7.6B params.
        The intensity figure divides model FLOPs (2P) by (weights + KV) bytes — an honest
        first-order estimate; real kernels add activations and attention traffic.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${tone === 'bad' ? 'text-bad' : 'text-zinc-100'}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
