import { cn } from '@/lib/utils'
import { fmtBytes } from '@/lib/format'

export interface MemItem {
  label: string
  bytes: number
  color?: string
  sub?: string
}

export function MemoryBar({ items, maxBytes, className }: { items: MemItem[]; maxBytes?: number; className?: string }) {
  const max = maxBytes ?? Math.max(...items.map((i) => i.bytes), 1)
  return (
    <div className={cn('space-y-3', className)} role="list" aria-label="memory comparison bars">
      {items.map((item) => (
        <div key={item.label} role="listitem" className="block">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="text-xs text-mute">{item.label}</span>
            <span className="font-mono text-xs text-zinc-100">{fmtBytes(item.bytes)}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-md bg-panel-2">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${Math.max((item.bytes / max) * 100, item.bytes > 0 ? 1.2 : 0)}%`,
                backgroundColor: item.color ?? '#22d3ee',
              }}
            />
          </div>
          {item.sub ? <p className="mt-1 font-mono text-[10px] text-dim">{item.sub}</p> : null}
        </div>
      ))}
    </div>
  )
}
