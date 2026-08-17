import { useMemo, useState } from 'react'
import { Button, Callout, Formula, Toggle } from '@/components/ui'
import { LineChart, type Series } from '@/components/viz'
import { fmtBig } from '@/lib/format'
import { cumulativeFlops } from '../lib'

const TOKENS = ['the', ' cat', ' sat', ' on', ' the']
const D = 3584
const L = 28

export default function RedundancyChapter() {
  const [cached, setCached] = useState(true)
  const [pos, setPos] = useState(1)
  const steps = 24

  const noCache = useMemo(() => cumulativeFlops(D, L, steps, false), [])
  const withCache = useMemo(() => cumulativeFlops(D, L, steps, true), [])
  const series: Series[] = [
    { name: 'no cache', color: '#fb7185', points: noCache },
    { name: 'with KV cache', color: '#22d3ee', points: withCache },
  ]

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Generation is autoregressive: token 51 needs the K and V vectors of tokens 1–50. But those{' '}
        <em>never change</em> — K and V are pure functions of the prefix. Recomputing them every
        step is redundant by construction. The KV cache stores them once and appends one new entry
        per generated token.
      </p>

      <Formula caption="Same math, wildly different cost: without the cache, step t re-projects the entire prefix; with it, step t projects exactly one token.">
        K<sub>t</sub> = [k<sub>1</sub>, …, k<sub>t−1</sub> (cached), k<sub>t</sub> (new)]
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <div className="mb-5 max-w-sm">
          <Toggle
            label="KV cache"
            checked={cached}
            onChange={setCached}
            color={cached ? 'good' : 'delta'}
            hint={cached ? 'On: append k_t, v_t to the cache; reuse everything else.' : 'Off: recompute K/V for the whole prefix at every step.'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TOKENS.map((t, i) => (
            <span
              key={i}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${
                i === pos ? 'border-delta bg-delta/10 text-delta' : i < pos ? 'border-line bg-panel-2 text-mute' : 'border-line/50 text-dim opacity-50'
              }`}
            >
              {t}
            </span>
          ))}
          <span className="flex items-center font-mono text-xs text-dim">… generating</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setPos((p) => (p + 1) % TOKENS.length)}
            variant="primary"
          >
            Generate next token →
          </Button>
          <p className="font-mono text-xs text-mute" aria-live="polite">
            this step: {cached ? (
              <span className="text-good">1 new K/V pair</span>
            ) : (
              <span className="text-bad">{pos + 1} K/V pairs recomputed ({pos} wasted)</span>
            )}
          </p>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">
            cumulative attention+projection FLOPs, decoding 24 tokens (Qwen2.5-7B dims, computed)
          </p>
          <LineChart series={series} xLabel="decode step" yLabel="FLOPs" xMax={steps - 1} formatY={(v) => fmtBig(v * 1e6)} />
          <p className="mt-2 font-mono text-xs text-mute">
            at step 24: no-cache has done {fmtBig(noCache[23] / withCache[23])}× the work of cached
          </p>
        </div>
      </div>

      <Callout variant="idea">
        The cache converts a quadratic-cost generation loop into a linear one. Nothing about the
        math changes — softmax over 1..t is softmax over 1..t — only <em>when</em> each k and v gets
        computed: once, instead of t times.
      </Callout>
      <Callout variant="note">
        FLOPs here use the honest simplified model 2·d²·L per token for projections and 2·d·L·t
        for attention scores/values — the same order teachers use for back-of-envelope estimates.
      </Callout>
    </div>
  )
}
