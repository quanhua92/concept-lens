export interface Series {
  name: string
  color: string
  points: number[]
  offset?: number
}

interface LineChartProps {
  series: Series[]
  xLabel?: string
  yLabel?: string
  logScale?: boolean
  height?: number
  xMax?: number
  xTickLabels?: string[]
  formatY?: (v: number) => string
}

export function LineChart({
  series,
  xLabel,
  yLabel,
  logScale = false,
  height = 260,
  xMax,
  xTickLabels,
  formatY,
}: LineChartProps) {
  const W = 560
  const H = height
  const padL = 52
  const padR = 16
  const padT = 14
  const padB = 34

  const transform = (v: number): number => (logScale ? Math.log10(Math.max(v, 1e-8)) : v)

  const finiteValues = series.flatMap((s) => s.points.map(transform).filter(Number.isFinite))
  const yMinRaw = finiteValues.length ? Math.min(...finiteValues) : 0
  const yMaxRaw = finiteValues.length ? Math.max(...finiteValues) : 1
  const yPad = (yMaxRaw - yMinRaw) * 0.08 || 0.5
  const yMin = yMinRaw - yPad
  const yMax = yMaxRaw + yPad

  const n = Math.max(...series.map((s) => s.points.length))
  const xEnd = xMax ?? n - 1
  const scaleX = (i: number): number => padL + ((W - padL - padR) * i) / Math.max(xEnd, 1)
  const scaleY = (v: number): number => padT + (H - padT - padB) * (1 - (v - yMin) / (yMax - yMin))

  const yTicksCount = 4
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicksCount)
  const xTickCount = Math.min(6, xEnd)
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((xEnd * i) / xTickCount))

  const fmtY =
    formatY ??
    ((v: number) => (logScale ? `1e${Math.round(v)}` : v.toFixed(Math.abs(yMax) < 10 ? 1 : 0)))

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`line chart of ${series.map((s) => s.name).join(' and ')}`}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={scaleY(t)} y2={scaleY(t)} stroke="#26262e" strokeWidth="1" />
            <text x={padL - 8} y={scaleY(t) + 3.5} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">
              {fmtY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={t}
            x={scaleX(t)}
            y={H - padB + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#71717a"
            fontFamily="ui-monospace, monospace"
          >
            {xTickLabels ? (xTickLabels[t] ?? String(t)) : t}
          </text>
        ))}
        {yLabel ? (
          <text x={12} y={padT + 4} fontSize="10" fill="#a1a1aa">
            {yLabel}
          </text>
        ) : null}
        {xLabel ? (
          <text x={W - padR} y={H - 4} textAnchor="end" fontSize="10" fill="#a1a1aa">
            {xLabel}
          </text>
        ) : null}
        {series.map((s) => {
          if (s.points.length === 0) return null
          const start = s.offset ?? 0
          const path = s.points
            .map((p, i) => {
              const x = scaleX(start + i)
              const y = scaleY(transform(p))
              return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
            })
            .join(' ')
          const lastIdx = s.points.length - 1
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={scaleX(start + lastIdx)} cy={scaleY(transform(s.points[lastIdx]))} r="4" fill={s.color} />
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-2 text-xs text-mute">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
