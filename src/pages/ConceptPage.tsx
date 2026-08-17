import { Suspense, useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getConcept } from '@/concepts'
import { difficultyColor } from '@/concepts/registry'
import { ChapterNav } from '@/components/ui'
import { useActiveSection } from '@/hooks/useActiveSection'

function ChapterSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel" aria-label="loading chapter" />
  )
}

export default function ConceptPage() {
  const { slug } = useParams<{ slug: string }>()
  const concept = slug ? getConcept(slug) : undefined
  const chapterIds = useMemo(() => concept?.chapters.map((c) => c.id) ?? [], [concept])
  const activeId = useActiveSection(chapterIds)

  if (!concept) return <Navigate to="/" replace />

  const activeIndex = Math.max(
    0,
    concept.chapters.findIndex((c) => c.id === activeId),
  )
  const next = concept.chapters[activeIndex + 1]

  return (
    <article>
      <header className="mx-auto max-w-3xl px-4 pt-12 pb-8 sm:px-6">
        <Link to="/" className="text-xs text-dim transition-colors hover:text-accent">
          ← all concepts
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {concept.title}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${difficultyColor[concept.difficulty]}`}
          >
            {concept.difficulty}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-mute">{concept.tagline}</p>
      </header>

      <ChapterNav
        chapters={concept.chapters.map(({ id, title }) => ({ id, title }))}
        activeId={activeId}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {concept.chapters.map((ch, i) => (
          <section
            key={ch.id}
            id={ch.id}
            aria-labelledby={`${ch.id}-title`}
            className="scroll-mt-28 border-t border-line/60 py-12 first:border-t-0 first:pt-8"
          >
            <p className="font-mono text-xs text-accent">chapter {i + 1}</p>
            <h2 id={`${ch.id}-title`} className="mt-2 mb-7 text-2xl font-semibold tracking-tight text-zinc-100">
              {ch.title}
            </h2>
            <Suspense fallback={<ChapterSkeleton />}>
              <ch.Component />
            </Suspense>
          </section>
        ))}

        <footer className="flex flex-col gap-3 border-t border-line py-10 pb-16 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-sm text-dim transition-colors hover:text-accent">
            ← all concepts
          </Link>
          {next ? (
            <a
              href={`#${next.id}`}
              className="text-sm text-accent transition-opacity hover:opacity-80"
            >
              next: {next.title} →
            </a>
          ) : (
            <Link to="/" className="text-sm text-accent transition-opacity hover:opacity-80">
              start over →
            </Link>
          )}
        </footer>
      </div>
    </article>
  )
}
