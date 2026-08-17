import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line py-8">
        <p className="mx-auto max-w-5xl px-4 text-center text-xs text-dim sm:px-6">
          concept-lens — every number on this site is computed live in your browser, not faked.
        </p>
      </footer>
    </div>
  )
}
