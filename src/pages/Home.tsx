import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { concepts } from '@/concepts'
import { ConceptCard } from '@/components/layout'
import { fadeUp, stagger } from '@/lib/anim'

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="py-16 sm:py-24">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="font-mono text-xs tracking-widest text-accent uppercase">
            concept-lens
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance text-zinc-50 sm:text-5xl sm:text-6xl"
          >
            See how machine learning <span className="text-accent">thinks</span>.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-mute sm:text-lg">
            Interactive explanations of the ideas behind modern AI — sliders instead of slideshows,
            and every number computed live in your browser, never faked.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={`/c/${concepts[0].slug}`}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start: {concepts[0].title} →
            </Link>
            <p className="text-xs text-dim">
              {concepts.length} concept{concepts.length > 1 ? 's' : ''} · more added over time
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section aria-label="Concepts" className="pb-20">
        <h2 className="mb-6 text-sm font-medium tracking-wide text-dim uppercase">All concepts</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {concepts.map((c, i) => (
            <ConceptCard key={c.slug} concept={c} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
