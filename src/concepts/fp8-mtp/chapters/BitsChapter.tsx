import { useMemo, useState } from 'react'
import { Callout, Formula, Slider } from '@/components/ui'
import { BitLegend, BitRow } from '@/components/viz'
import {
  FMT_BF16,
  FMT_E4M3,
  FMT_E5M2,
  FMT_FP16,
  bitsToString,
  floatBits,
  floatGrid,
  floatMaxFinite,
  fromFloatBits,
} from '@/lib/math'
import { fmt } from '@/lib/utils'

export default function BitsChapter() {
  const [value, setValue] = useState(1.6)

  const rows = useMemo(
    () =>
      [
        { fmt: FMT_FP16, color: 'text-zinc-300' },
        { fmt: FMT_BF16, color: 'text-accent' },
        { fmt: FMT_E4M3, color: 'text-delta' },
        { fmt: FMT_E5M2, color: 'text-bad' },
      ].map(({ fmt: f, color }) => {
        const bits = floatBits(value, f)
        const roundTrip = fromFloatBits(bits, f)
        return {
          f,
          color,
          bits,
          roundTrip,
          err: Math.abs(roundTrip - value),
          relErr: value !== 0 ? Math.abs((roundTrip - value) / value) * 100 : 0,
        }
      }),
    [value],
  )

  const gridE4M3 = useMemo(() => floatGrid(FMT_E4M3, 0.99, 2.01), [])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        FP16 and BF16 both spend 16 bits. FP8 halves the budget — and the interesting question is{' '}
        <em>where</em> the bits go. E4M3 (4 exponent, 3 mantissa) prioritizes precision with a
        range cap of ±448. E5M2 trades two mantissa bits for huge range (±65,504). DeepSeek-V3
        trains in E4M3 for most tensors — pick a value and watch the hardware encode it.
      </p>

      <Formula caption="sign · 1.mantissa · 2^(exp−bias). Every format below encodes the same number you choose — count the surviving mantissa bits.">
        value = (−1)^s × 1.m × 2^(e−bias)
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="value to encode"
          value={value}
          min={0.5}
          max={3}
          step={0.001}
          onChange={setValue}
          format={(v) => v.toFixed(3)}
          hint="Drag slowly — each format snaps to its nearest representable value."
        />

        <div className="mt-5 space-y-4">
          {rows.map(({ f, color, bits, roundTrip, relErr }) => (
            <div key={f.name} className="rounded-xl border border-line bg-panel-2 p-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className={`font-mono text-xs font-semibold ${color}`}>{f.name}</span>
                <span className="font-mono text-[11px] text-dim">
                  encoded: {bitsToString(bits, f)} → {fmt(roundTrip, 4)} · rel err{' '}
                  <span className={relErr > 5 ? 'text-bad' : relErr > 1 ? 'text-delta' : 'text-good'}>
                    {relErr.toFixed(2)}%
                  </span>
                </span>
              </div>
              <BitRow bits={bits} fmt={f} cell={24} />
            </div>
          ))}
        </div>

        <div className="mt-5">
          <BitLegend />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs text-dim">
            the E4M3 grid near your value — every representable float in [1, 2] (8 per octave)
          </p>
          <div className="relative h-10 rounded-lg border border-line bg-panel-2">
            {gridE4M3.map((v, i) => (
              <span
                key={i}
                className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-delta/70"
                style={{ left: `${((v - 1) / 1) * 100}%` }}
                title={String(v)}
              />
            ))}
            <span
              className="absolute top-0 h-full w-0.5 bg-accent"
              style={{ left: `${Math.min(Math.max((value - 1), 0), 1) * 100}%` }}
              title={`your value ${value}`}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-dim">
            gaps double every octave — that’s floating point: relative precision, absolute gaps
            that scale with magnitude. Max finite: FP16 65,504 · BF16 ≈3.4e38 · E4M3{' '}
            {floatMaxFinite(FMT_E4M3)} · E5M2 {floatMaxFinite(FMT_E5M2).toLocaleString()}
          </p>
        </div>
      </div>

      <Callout variant="idea">
        Three mantissa bits = 8 steps per octave ≈ 1–2 decimal digits. That sounds hopeless until
        you remember training noise dwarfs it — DeepSeek-V3 trained 14.8T tokens this way, with
        careful scaling (next chapter) keeping tensors inside E4M3’s narrow ±448 window.
      </Callout>
      <Callout variant="note">
        All bit patterns are computed by the site’s own encoder/decoder (round-to-nearest on the
        real IEEE-style rules; E4M3 per the OCP FP8 spec, no infinities, max finite 448).
      </Callout>
    </div>
  )
}
