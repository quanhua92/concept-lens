import { fmt } from '@/lib/utils'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  hint?: string
}

export function Slider({ label, value, min, max, step = 1, onChange, format, hint }: SliderProps) {
  return (
    <label className="block select-none">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-mute">{label}</span>
        <span className="font-mono text-xs text-accent">{format ? format(value) : fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {hint ? <span className="block text-xs leading-relaxed text-dim">{hint}</span> : null}
    </label>
  )
}
