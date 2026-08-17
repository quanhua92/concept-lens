import { motion } from 'framer-motion'
import { cn, fmt } from '@/lib/utils'

export interface DistItem {
  label: string
  p: number
  color?: string
}

export function DistBars({
  items,
  maxP,
  highlight,
  height = 150,
  className,
  labelAngle = true,
}: {
  items: DistItem[]
  maxP?: number
  highlight?: number | null
  height?: number
  className?: string
  labelAngle?: boolean
}) {
  const max = maxP ?? Math.max(...items.map((i) => i.p), 1e-9)
  return (
    <div className={cn('w-full', className)} role="img" aria-label="probability distribution">
      <div className="flex items-stretch gap-1.5" style={{ height }}>
        {items.map((item, i) => (
          <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
            <span className={cn('font-mono text-[9px] leading-none', highlight === i ? 'text-zinc-100' : 'text-dim')}>
              {item.p >= 0.001 ? fmt(item.p * 100, 1) : ''}
            </span>
            <div className="flex w-full min-h-0 flex-1 items-end">
              <motion.div
                animate={{ height: `${Math.max((item.p / max) * 100, 1.5)}%` }}
                transition={{ duration: 0.4 }}
                className={cn(
                  'w-full rounded-t-[4px]',
                  highlight === i && 'ring-2 ring-zinc-100 ring-offset-1 ring-offset-panel',
                )}
                style={{
                  backgroundColor: item.color ?? (highlight === i ? '#f4f4f5' : '#22d3ee'),
                  opacity: highlight === undefined || highlight === null || highlight === i ? 1 : 0.55,
                  minHeight: 3,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {items.map((item) => (
          <span
            key={item.label}
            className={cn(
              'min-w-0 flex-1 truncate text-center font-mono text-[9px] text-dim',
              labelAngle && '-rotate-45 translate-y-1',
            )}
            title={item.label}
          >
            {itemAngleFix(item.label, labelAngle)}
          </span>
        ))}
      </div>
    </div>
  )
}

function itemAngleFix(label: string, angle: boolean): string {
  return angle ? label.slice(0, 6) : label
}
