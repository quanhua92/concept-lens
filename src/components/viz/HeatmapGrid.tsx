import { motion } from 'framer-motion'
import { cn, fmt } from '@/lib/utils'

function cellColor(v: number): string {
  const a = Math.min(1, Math.abs(v)) * 0.82 + 0.06
  return v >= 0 ? `rgba(34, 211, 238, ${a})` : `rgba(251, 113, 133, ${a})`
}

interface HeatmapGridProps {
  values: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  highlightRow?: number | null
  onRowClick?: (row: number) => void
  showValues?: boolean
  scale?: number
  writeOverlay?: number[][] | null
  className?: string
  ariaLabel?: string
}

export function HeatmapGrid({
  values,
  rowLabels,
  colLabels,
  highlightRow = null,
  onRowClick,
  showValues = false,
  scale = 1,
  writeOverlay = null,
  className,
  ariaLabel = 'matrix heatmap',
}: HeatmapGridProps) {
  const cols = values[0]?.length ?? 0
  return (
    <div className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      <div className="flex gap-2">
        {rowLabels ? (
          <div className="flex shrink-0 flex-col gap-1 pt-0.5" aria-hidden>
            {values.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'flex h-9 items-center justify-end pr-1 font-mono text-[11px] transition-colors',
                  highlightRow === i ? 'text-accent' : 'text-dim',
                  onRowClick ? 'cursor-pointer' : '',
                )}
                style={{ minHeight: '2.25rem' }}
              >
                {rowLabels[i]}
              </span>
            ))}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {colLabels ? (
            <div
              className="mb-1 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              aria-hidden
            >
              {colLabels.map((l) => (
                <span key={l} className="text-center font-mono text-[10px] text-dim">
                  {l}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            {values.map((row, i) => (
              <div
                key={i}
                className={cn(
                  'grid gap-1 rounded-md p-0.5 transition-colors',
                  highlightRow === i && 'bg-accent/10',
                )}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                onClick={onRowClick ? () => onRowClick(i) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onRowClick(i)
                      }
                    : undefined
                }
              >
                {row.map((v, j) => (
                  <motion.div
                    key={j}
                    animate={{ backgroundColor: cellColor(v / scale) }}
                    transition={{ duration: 0.45 }}
                    className={cn(
                      'relative flex aspect-square items-center justify-center overflow-hidden rounded-[4px] font-mono text-[10px] text-zinc-950/80',
                      onRowClick && 'cursor-pointer',
                    )}
                    title={fmt(v, 2)}
                  >
                    {writeOverlay ? (
                      <motion.span
                        aria-hidden
                        animate={{ opacity: Math.min(1, Math.abs(writeOverlay[i][j] / scale)) * 0.85 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 rounded-[4px]"
                        style={{ backgroundColor: '#f59e0b' }}
                      />
                    ) : null}
                    {showValues ? (
                      <span className="relative z-10 mix-blend-plus-lighter">{fmt(v, 1)}</span>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-dim">
      <span className="font-mono">-1</span>
      <span
        aria-hidden
        className="h-2 w-24 rounded-full"
        style={{ background: 'linear-gradient(to right, rgba(251,113,133,0.9), rgba(39,39,42,0.4), rgba(34,211,238,0.9))' }}
      />
      <span className="font-mono">+1</span>
    </div>
  )
}
