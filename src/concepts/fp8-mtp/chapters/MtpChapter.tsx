import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Callout, Formula, Slider } from '@/components/ui'
import { fmt } from '@/lib/utils'

const DEPTHS = [1, 2, 3, 4]

export default function MtpChapter() {
  const [acceptance, setAcceptance] = useState(0.75)
  const [steps, setSteps] = useState(0)
  const [tokens, setTokens] = useState<{ depth: number; accepted: boolean }[]>([
    { depth: 0, accepted: true },
  ])

  const beta = acceptance

  const expected = useMemo(() => {
    const acceptedPerPass = DEPTHS.reduce((s, d) => s + Math.pow(beta, d), 0)
    return { tokensPerPass: 1 + acceptedPerPass, acceptedPerPass }
  }, [beta])

  const speedup = expected.tokensPerPass

  const stepOnce = () => {
    const rng = mulberryLite(steps * 17 + 3)
    const batch = DEPTHS.map((d) => rng() < Math.pow(beta, d))
    let cut = batch.findIndex((b) => !b)
    if (cut === -1) cut = DEPTHS.length
    setSteps((s) => s + 1)
    setTokens((t) => [...t, ...DEPTHS.slice(0, cut).map((_, i) => ({ depth: i + 1, accepted: true })), ...(cut < DEPTHS.length ? [{ depth: cut + 1, accepted: false }] : [])])
  }

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        Decode emits one token per forward pass — brutally serial.{' '}
        <strong className="text-zinc-100">Multi-token prediction</strong> adds extra heads that
        predict t+2, t+3, t+4 from the same pass. At training time they deepen the gradient signal;
        at inference they become a <em>free draft model</em> for speculative decoding.
      </p>

      <Formula caption="MTP module k reuses the main trunk's hidden state, adds its own projection + head, and predicts token t+k+1. The extra heads stay cheap because they share the expensive trunk.">
        h<sup>(k)</sup> = Comb(h<sup>main</sup>, Emb(t<sub>k+1</sub>)) → own head → P(t<sub>k+2</sub>)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="per-depth acceptance rate β"
          value={acceptance}
          min={0.3}
          max={0.95}
          step={0.05}
          onChange={setAcceptance}
          format={(v) => v.toFixed(2)}
          hint="Probability the verifier accepts each drafted token (product chain rule → depth 4 needs β⁴)."
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={stepOnce}>
            One speculative pass →
          </Button>
          <Button
            onClick={() => {
              setTokens([{ depth: 0, accepted: true }])
              setSteps(0)
            }}
          >
            Reset
          </Button>
          <p className="font-mono text-xs text-dim">{steps} passes so far</p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs text-dim">
            generated stream — colored by which depth produced it (gray = main head, amber = drafted, red = rejected &amp; resampled)
          </p>
          <div className="flex flex-wrap gap-1.5" aria-live="polite">
            {tokens.map((t, i) => (
              <motion.span
                key={i}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-md border px-2 py-1 font-mono text-xs ${
                  t.depth === 0
                    ? 'border-line bg-panel-2 text-zinc-300'
                    : t.accepted
                      ? 'border-delta/40 bg-delta/10 text-delta'
                      : 'border-bad/40 bg-bad/10 text-bad line-through'
                }`}
                title={t.depth === 0 ? 'main head' : `MTP depth ${t.depth}, ${t.accepted ? 'accepted' : 'rejected'}`}
              >
                {t.depth === 0 ? '·' : `+${t.depth}`}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="tokens per pass (expected)" value={fmt(speedup, 2)} tone={speedup > 2 ? 'good' : 'warn'} sub={`1 + β + β² + β³ + β⁴`} />
          <Stat label="speedup ceiling" value={`${fmt(speedup, 2)}×`} sub="if drafting is ~free (shared trunk)" />
          <Stat label="P(all 4 accepted)" value={fmt(Math.pow(beta, 4) * 100, 1) + '%'} sub="β⁴ — depth is fragile" tone={Math.pow(beta, 4) < 0.3 ? 'bad' : undefined} />
        </div>
      </div>

      <Callout variant="idea">
        The arithmetic of speculation: a pass that verifies 1 + Σβᵏ tokens costs barely more than a
        normal pass (weights are already loaded — this is the bandwidth-bound decode regime), so
        throughput scales with accepted tokens per pass. MTP makes the draft nearly free since it
        shares the trunk’s hidden state.
      </Callout>
      <Callout variant="note">
        Acceptance here is a single tunable β (per-depth, i.i.d.) for clarity; real systems
        estimate acceptance from the actual draft/target distributions (the speculative-decoding
        concept computes it exactly). The tokens-per-pass formula is the standard E[T] for greedy
        chain acceptance.
      </Callout>
    </div>
  )
}

function mulberryLite(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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
