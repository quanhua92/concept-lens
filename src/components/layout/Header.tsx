import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="17" fill="none" stroke="#22d3ee" strokeWidth="5" />
            <circle cx="32" cy="32" r="6" fill="#f59e0b" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100 group-hover:text-accent">
            concept-lens
          </span>
        </Link>
        <p className="hidden text-xs text-dim sm:block">interactive ML intuitions</p>
      </div>
    </header>
  )
}
