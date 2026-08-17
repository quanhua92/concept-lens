import { cn } from '@/lib/utils'
import type { FloatFormat } from '@/lib/math'

export function BitRow({
  bits,
  fmt,
  cell = 26,
  className,
}: {
  bits: number
  fmt: FloatFormat
  cell?: number
  className?: string
}) {
  const total = 1 + fmt.eBits + fmt.mBits
  const cells: { bit: number; kind: 'sign' | 'exp' | 'mant' }[] = []
  for (let i = total - 1; i >= 0; i--) {
    const bit = (bits >> i) & 1
    const posFromMsb = total - 1 - i
    const kind = posFromMsb === 0 ? 'sign' : posFromMsb <= fmt.eBits ? 'exp' : 'mant'
    cells.push({ bit, kind })
  }
  const color = {
    sign: 'bg-bad/80 text-zinc-950',
    exp: 'bg-accent/80 text-zinc-950',
    mant: 'bg-delta/70 text-zinc-950',
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)} aria-label={`${fmt.name} bit pattern`}>
      {cells.map((c, i) => (
        <span
          key={i}
          className={cn(
            'flex items-center justify-center rounded-md font-mono text-sm font-semibold',
            c.bit ? color[c.kind] : 'bg-panel-2 text-dim',
          )}
          style={{ width: cell, height: cell }}
        >
          {c.bit}
        </span>
      ))}
    </div>
  )
}

export function BitLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-dim">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-bad/80" /> sign
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-accent/80" /> exponent ({' '}
        {`2^e, bias`} )
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-delta/70" /> mantissa
      </span>
    </div>
  )
}
