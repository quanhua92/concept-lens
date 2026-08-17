import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { ConceptMeta } from '@/concepts/registry'
import { difficultyColor } from '@/concepts/registry'
import { fadeUp } from '@/lib/anim'

export function ConceptCard({ concept }: { concept: ConceptMeta }) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/c/${concept.slug}`}
        className="group block h-full rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-line bg-panel-2 px-2.5 py-0.5 font-mono text-[10px] text-dim">
            {concept.stage ? `stage ${concept.stage}` : 'interlude'}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${difficultyColor[concept.difficulty]}`}
          >
            {concept.difficulty}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-100 group-hover:text-accent">
          {concept.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-mute">{concept.tagline}</p>
        <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-dim">
          <span>{concept.chapters.length} chapters</span>
          <span aria-hidden>·</span>
          <span>~{concept.chapters.length * 3} min</span>
          <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </p>
      </Link>
    </motion.div>
  )
}
