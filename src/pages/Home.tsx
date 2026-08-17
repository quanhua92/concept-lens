import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { concepts } from '@/concepts'
import { ConceptCard } from '@/components/layout'
import { TRACKS } from '@/concepts/registry'
import { fadeUp, stagger } from '@/lib/anim'

export default function Home() {
  const first = concepts[0]
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
            Interactive explanations of the ideas behind modern AI — from attention to MoE to
            inference engines. Sliders instead of slideshows, and every number computed live in
            your browser, never faked.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={`/c/${first.slug}`}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start: {first.title} →
            </Link>
            <p className="text-xs text-dim">
              {concepts.length} concepts · {TRACKS.length} tracks · following an 18-stage curriculum
            </p>
          </motion.div>
        </motion.div>
      </section>

      {TRACKS.map((track) => {
        const inTrack = concepts.filter((c) => c.track === track.id)
        if (inTrack.length === 0) return null
        return (
          <section key={track.id} aria-label={track.label} className="pb-14">
            <div className="mb-6 border-t border-line pt-8">
              <h2 className="text-sm font-medium tracking-wide text-zinc-100 uppercase">{track.label}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-dim">{track.blurb}</p>
            </div>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {inTrack.map((c) => (
                <ConceptCard key={c.slug} concept={c} />
              ))}
            </motion.div>
          </section>
        )
      })}
    </div>
  )
}
