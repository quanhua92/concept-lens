import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, SegmentedControl, Slider } from '@/components/ui'
import { fmt } from '@/lib/utils'
import { generateRequests, simulateContinuous, simulateStatic } from '../lib'

type Mode = 'static' | 'continuous'

const N = 24

export default function BatchingChapter() {
  const [mode, setMode] = useState<Mode>('static')
  const [maxBatch, setMaxBatch] = useState(8)
  const [rate, setRate] = useState(5)
  const [seed, setSeed] = useState(7)

  const reqs = useMemo(() => generateRequests(seed, N, rate), [seed, rate])
  const result = useMemo(
    () => (mode === 'static' ? simulateStatic(reqs, maxBatch) : simulateContinuous(reqs, maxBatch)),
    [reqs, maxBatch, mode],
  )
  const other = useMemo(
    () => (mode === 'static' ? simulateContinuous(reqs, maxBatch) : simulateStatic(reqs, maxBatch)),
    [reqs, maxBatch, mode],
  )

  const tMax = Math.max(result.totalMs, other.totalMs)
  const rowH = 14
  const chartH = N * rowH + 24

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The naive serving loop: collect a batch, run it until <em>every</em> request finishes, start
        the next. Sounds reasonable — until one 300-token generation holds seven empty slots
        hostage. <strong className="text-zinc-100">Continuous batching</strong> schedules at every
        iteration: a finished request leaves immediately, a waiting request joins immediately. The
        simulation below is a real discrete-event scheduler (seeded arrivals, bandwidth-modeled
        iteration times) — both modes see identical requests.
      </p>

      <Formula caption="Iteration-level scheduling (Orca, 2022): the batch composition can change every decode step. Iteration time uses the roofline model — weights + live KV bytes over 4090 bandwidth.">
        batch(t+1) = batch(t) − finished + admitted
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <SegmentedControl
              options={[
                { value: 'static', label: 'static batching' },
                { value: 'continuous', label: 'continuous batching' },
              ]}
              value={mode}
              onChange={setMode}
              ariaLabel="scheduler"
            />
          </div>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="justify-self-start rounded-xl border border-line px-3 py-2 text-xs text-mute hover:border-zinc-600"
          >
            reroll requests
          </button>
          <Slider label="max batch size" value={maxBatch} min={2} max={12} onChange={setMaxBatch} format={(v) => `${v}`} />
          <Slider
            label="arrival rate"
            value={rate}
            min={2}
            max={12}
            step={0.5}
            onChange={setRate}
            format={(v) => `${v}/s`}
            hint="Below ~batch/latency the queue starves; above it, requests pile up."
          />
        </div>

        <div className="mt-6 overflow-x-auto scrollbar-none">
          <svg
            viewBox={`0 0 560 ${chartH}`}
            className="h-auto w-full min-w-[520px]"
            role="img"
            aria-label={`request timeline, ${mode} batching`}
          >
            {reqs.map((r, i) => {
              const y = i * rowH
              const seg = result.segments.find((s) => s.reqId === r.id)
              const x0 = (r.arrivalMs / tMax) * 560
              const x1 = seg ? (seg.startMs / tMax) * 560 : x0
              const x2 = seg ? (seg.endMs / tMax) * 560 : x0
              return (
                <g key={r.id}>
                  <rect x={x0} y={y + 2} width={Math.max(x1 - x0, 0.5)} height={rowH - 5} fill="#1a1a21" rx="2" />
                  {seg ? (
                    <motion.rect
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      x={x1}
                      y={y + 2}
                      width={Math.max(x2 - x1, 1)}
                      height={rowH - 5}
                      rx="2"
                      fill={mode === 'continuous' ? '#22d3ee' : '#f59e0b'}
                      opacity={0.85}
                    />
                  ) : null}
                  <text x={2} y={y + 9.5} fontSize="8" fill="#52525b" fontFamily="ui-monospace, monospace">
                    {r.id}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-dim">
          <span>■ waiting (arrival → first slot)</span>
          <span style={{ color: mode === 'continuous' ? '#22d3ee' : '#f59e0b' }}>■ generating</span>
          <span>requests sorted by arrival, top = first</span>
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="throughput" value={`${fmt(result.throughputReqPerSec, 2)} req/s`} sub={`other mode: ${fmt(other.throughputReqPerSec, 2)}`} tone="good" />
          <Stat label="avg latency" value={`${fmt(result.avgLatencyMs / 1000, 2)} s`} sub={`other: ${fmt(other.avgLatencyMs / 1000, 2)} s`} tone={result.avgLatencyMs < other.avgLatencyMs ? 'good' : 'warn'} />
          <Stat label="wasted slot-time" value={`${fmt(result.wastedSlotPct, 0)}%`} sub={`other: ${fmt(other.wastedSlotPct, 0)}% (empty slots still pay the weight-read)`} tone={result.wastedSlotPct < other.wastedSlotPct ? 'good' : 'bad'} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="GPU busy" value={`${fmt(result.gpuBusyPct, 0)}%`} sub={`other: ${fmt(other.gpuBusyPct, 0)}%`} />
          <Stat label="makespan" value={`${fmt(result.totalMs / 1000, 1)} s`} sub={`other: ${fmt(other.totalMs / 1000, 1)} s`} />
          <Stat label="peak batch" value={`${result.maxBatchSeen}`} sub={`limit ${maxBatch}`} />
        </div>
      </div>

      <Callout variant="idea">
        Static batching’s fatal flaw is visible in the long tail bars: after the first finisher,
        every remaining iteration runs with empty seats — and the GPU still reads all 15 GB of
        weights. Continuous scheduling keeps the seats full because{' '}
        <em>scheduling granularity</em> (one iteration) matches <em>completion granularity</em> (one
        token).
      </Callout>
      <Callout variant="note">
        Deterministic discrete-event simulation: seeded Poisson-ish arrivals (rate slider), prompt
        64–255, generation 48–255 tokens; iteration time = (weights + live KV)/bandwidth from the
        roofline concept (4090, 1,008 GB/s, Qwen2.5-7B KV accounting). No padding costs are modeled
        for static (that would widen the gap further).
      </Callout>
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-delta' : tone === 'bad' ? 'text-bad' : 'text-zinc-100'
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-3">
      <p className="text-[11px] tracking-wide text-dim uppercase">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-dim">{sub}</p> : null}
    </div>
  )
}
