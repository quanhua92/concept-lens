import { cn } from '@/lib/utils'

export interface ChapterNavItem {
  id: string
  title: string
}

interface ChapterNavProps {
  chapters: ChapterNavItem[]
  activeId: string
}

export function ChapterNav({ chapters, activeId }: ChapterNavProps) {
  return (
    <nav
      aria-label="Chapters"
      className="sticky top-14 z-30 -mx-4 border-b border-line bg-ink/85 px-4 backdrop-blur-md"
    >
      <ol className="mx-auto flex max-w-3xl gap-2 overflow-x-auto scrollbar-none py-2.5 px-4 sm:px-6">
        {chapters.map((ch, i) => (
          <li key={ch.id} className="shrink-0">
            <a
              href={`#${ch.id}`}
              aria-current={activeId === ch.id ? 'true' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors',
                activeId === ch.id
                  ? 'border-accent bg-accent/10 font-medium text-accent'
                  : 'border-line text-mute hover:border-zinc-600 hover:text-zinc-100',
              )}
            >
              <span className="font-mono opacity-60">{i + 1}</span>
              {ch.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
