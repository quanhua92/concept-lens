import { motion } from 'framer-motion'
import { cn, fmt } from '@/lib/utils'

interface BarVectorProps {
  values: number[]
  label?: string
  color?: string
  maxAbs?: number
  showIndexes?: boolean
  className?: string
}

export function BarVector({
  values,
  label,
  color = '#22d3ee',
  maxAbs,
  showIndexes = true,
  className,
}: BarVectorProps) {
  const max = maxAbs ?? Math.max(...values.map(Math.abs), 1e-9)
  return (
    <div className={cn('w-full', className)} aria-label={label ?? 'vector'}>
      <div className="flex flex-col gap-1">
        {values.map((v, i) => {
          const pct = (Math.abs(v) / max) * 50
          return (
            <div key={i} className="flex items-center gap-2">
              {showIndexes ? (
                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-dim">{i}</span>
              ) : null}
              <div className="relative h-3.5 flex-1 rounded bg-panel-2">
                <div className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
                <motion.div
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-y-0.5 rounded-[3px]"
                  style={{
                    backgroundColor: color,
                    left: v >= 0 ? '50%' : undefined,
                    right: v < 0 ? '50%' : undefined,
                  }}
                />
              </div>
              <span className="w-11 shrink-0 font-mono text-[10px] text-mute">{fmt(v, 2)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
