export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '—'
  if (v !== 0 && (Math.abs(v) >= 1000 || Math.abs(v) < 0.001)) {
    return v.toExponential(1)
  }
  return v.toFixed(digits)
}
