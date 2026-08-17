import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CalloutVariant = 'idea' | 'warn' | 'note'

const variants: Record<CalloutVariant, { label: string; border: string; text: string; badge: string }> = {
  idea: { label: 'Key idea', border: 'border-l-accent', text: 'text-zinc-100', badge: 'text-accent' },
  warn: { label: 'Careful', border: 'border-l-bad', text: 'text-zinc-100', badge: 'text-bad' },
  note: { label: 'Note', border: 'border-l-delta', text: 'text-zinc-100', badge: 'text-delta' },
}

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
}

export function Callout({ variant = 'idea', title, children }: CalloutProps) {
  const v = variants[variant]
  return (
    <aside
      className={cn(
        'rounded-r-xl border border-l-3 border-line bg-panel px-4 py-3.5 sm:px-5',
        v.border,
      )}
    >
      <p className={cn('mb-1 text-xs font-semibold tracking-wide uppercase', v.badge)}>
        {title ?? v.label}
      </p>
      <div className={cn('space-y-2 text-sm leading-relaxed text-mute', v.text)}>{children}</div>
    </aside>
  )
}
