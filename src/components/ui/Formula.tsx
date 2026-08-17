import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormulaProps {
  caption?: string
  children: ReactNode
  className?: string
}

export function Formula({ caption, children, className }: FormulaProps) {
  return (
    <figure className={cn('rounded-xl border border-line bg-panel-2 px-4 py-3.5', className)}>
      <div className="overflow-x-auto scrollbar-none font-mono text-sm leading-relaxed whitespace-nowrap text-zinc-100 sm:text-base">
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-xs leading-relaxed text-dim">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
