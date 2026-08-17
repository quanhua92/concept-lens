import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  color?: 'accent' | 'delta' | 'good'
  hint?: string
}

const colorMap = {
  accent: 'bg-accent',
  delta: 'bg-delta',
  good: 'bg-good',
} as const

export function Toggle({ label, checked, onChange, color = 'accent', hint }: ToggleProps) {
  return (
    <div className="select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="text-sm text-zinc-200">{label}</span>
        <span
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors',
            checked ? colorMap[color] : 'bg-panel-2',
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={cn(
              'absolute h-4.5 w-4.5 rounded-full bg-ink shadow',
              checked ? 'right-1' : 'left-1',
            )}
            style={{ backgroundColor: '#0a0a0c' }}
          />
        </span>
      </button>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-dim">{hint}</p> : null}
    </div>
  )
}
