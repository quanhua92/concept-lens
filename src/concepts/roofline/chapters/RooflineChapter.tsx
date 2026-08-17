import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { GPUS, decodePoint, prefillPoint, ridgePoint } from '../lib'
import { fmt } from '@/lib/utils'

const W = 560
const H = 340
const PAD = { l: 58, r: 16, t: 18, b: 40 }

export default function RooflineChapter() {
  const [gpuIdx, setGpuIdx] = useState(0)
  const [batch, setBatch] = useState(1)
  const gpu = GPUS[gpuIdx]
  const ctx = 4096

  const xMin = 0.1
  const xMax = 400
  const yMin = 1e11
  const yMax = 1.5e13

  const logX = (v: number) => Math.log10(v)
  const sx = (v: number) => PAD.l + ((logX(xMax) - logX(xMin) === 0 ? 0 : (logX(v) - logX(xMin)) / (logX(xMax) - logX(xMin))) * (W - PAD.l - PAD.r))
  const sy = (v: number) => PAD.t + (1 - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (H - PAD.t - PAD.b)

  const peakFlops = gpu.tflopsBf16 * 1e12
  const peakBytes = gpu.bandwidthGbs * 1e9
  const ridge = ridgePoint(gpu)

  const roofPath = useMemo(() => {
    const pts: string[] = []
    const start = xMin
    const atStart = Math.min(peakBytes * start, peakFlops)
    pts.push(`M ${sx(start).toFixed(1)} ${sy(atStart).toFixed(1)}`)
    pts.push(`L ${sx(ridge).toFixed(1)} ${sy(peakFlops).toFixed(1)}`)
    pts.push(`L ${sx(xMax).toFixed(1)} ${sy(peakFlops).toFixed(1)}`)
    return pts.join(' ')
  }, [gpu])

  const decode = decodePoint(batch, ctx, gpu)
  const prefill = prefillPoint(4096, gpu)

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Every chip has two ceilings: how fast it can <em>compute</em> (TFLOPS) and how fast it can{' '}
        <em>read memory</em> (GB/s). Which one bites you depends on one ratio —{' '}
        <strong className="text-zinc-100">arithmetic intensity</strong>: FLOPs performed per byte
        moved. The roofline chart draws both limits and the ridge where they cross.
      </p>

      <Formula caption="Attainable FLOPS = min(bandwidth × intensity, peak). Left of the ridge you're bandwidth-bound (idle compute); right of it, compute-bound (starved units).">
        ridge point = peak TFLOPS ÷ peak GB/s
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            options={GPUS.map((g, i) => ({ value: String(i), label: g.name }))}
            value={String(gpuIdx)}
            onChange={(v) => setGpuIdx(Number(v))}
            ariaLabel="gpu"
          />
          <p className="font-mono text-xs text-dim">
            ridge at {fmt(ridge, 0)} FLOP/byte · {gpu.tflopsBf16} TFLOPS · {gpu.bandwidthGbs} GB/s
          </p>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="roofline chart">
          {[0.1, 1, 10, 100].map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} stroke="#26262e" />
              <text x={sx(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">
                {t}
              </text>
            </g>
          ))}
          {[1e11, 1e12, 1e13].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="#26262e" />
              <text x={PAD.l - 8} y={sy(t) + 3.5} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">
                {t >= 1e12 ? `${(t / 1e12).toFixed(1)}T` : `${(t / 1e11).toFixed(0)}00G`}
              </text>
            </g>
          ))}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#a1a1aa">
            arithmetic intensity (FLOP / byte, log)
          </text>
          <text x={12} y={PAD.t + 2} fontSize="10" fill="#a1a1aa">
            attainable FLOPS
          </text>

          <path d={roofPath} fill="none" stroke={gpu.color} strokeWidth="2.5" strokeLinejoin="round" />
          <text x={sx(ridge) + 6} y={sy(peakFlops) - 8} fontSize="10" fill={gpu.color} fontFamily="ui-monospace, monospace">
            ridge {fmt(ridge, 0)}
          </text>
          <text x={sx(0.12)} y={sy(peakBytes * 0.1) + 24} fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace" transform={`rotate(-32 ${sx(0.12)} ${sy(peakBytes * 0.1) + 24})`}>
            bandwidth × I
          </text>

          <motion.g animate={{ x: sx(decode.intensity) - 8, y: sy(decode.attained) - 8 }} transition={{ duration: 0.3 }}>
            <circle r="6" fill="#22d3ee" stroke="#0a0a0c" strokeWidth="2" />
          </motion.g>
          <motion.g animate={{ x: sx(prefill.intensity) - 8, y: sy(prefill.attained) - 8 }} transition={{ duration: 0.3 }}>
            <rect width="12" height="12" rx="3" fill="#f59e0b" stroke="#0a0a0c" strokeWidth="2" />
          </motion.g>
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-mute">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
            decode (Qwen2.5-7B, batch {batch})
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-delta" />
            prefill (4k prompt)
          </span>
        </div>

        <div className="mt-5 max-w-md">
          <Slider
            label="decode batch size"
            value={batch}
            min={1}
            max={128}
            onChange={setBatch}
            format={(v) => `${v}`}
            hint="Slide right: the decode dot climbs the bandwidth slope toward the ridge — more sequences sharing one weight-read."
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label={`decode I (B=${batch})`} value={`${fmt(decode.intensity, 1)} FLOP/B`} sub={decode.bound === 'memory' ? 'bandwidth-bound' : 'compute-bound'} tone={decode.bound === 'memory' ? 'bad' : 'good'} />
          <Stat label="decode utilization" value={`${fmt(decode.utilization * 100, 1)}%`} sub="of peak FLOPS" tone={decode.utilization > 0.5 ? 'good' : 'warn'} />
          <Stat label="prefill I" value={`${fmt(prefill.intensity, 0)} FLOP/B`} sub={prefill.bound === 'compute' ? 'at the compute ceiling' : 'bandwidth-bound'} tone="good" />
        </div>
      </div>

      <Callout variant="idea">
        Same model, same GPU, two dots a thousand× apart in intensity. Prefill sits at the ceiling
        by design — every weight byte is reused across thousands of prompt tokens. Decode at batch
        1 crawls: one token per full weight-read. The whole serving track is about{' '}
        <em>moving the decode dot right</em>: batching (this chapter), paged KV (memory), quantized
        weights (smaller bytes), speculation (more tokens per read).
      </Callout>
      <Callout variant="note">
        Verified constants: A100 312 BF16 TFLOPS / 2,039 GB/s; H100 989 / 3,350; RTX 4090 165 /
        1,008 (dense tensor-core figures, FP16 accumulate). Intensity math: FLOPs = B(2P +
        2·d·ctx·L); bytes = weights + KV cache — computed live.
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-delta' : 'text-bad'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
