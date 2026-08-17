import type { ComponentType, LazyExoticComponent } from 'react'

export type Track = 'architecture' | 'compression' | 'serving' | 'alignment'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface TrackMeta {
  id: Track
  label: string
  blurb: string
}

export const TRACKS: TrackMeta[] = [
  {
    id: 'architecture',
    label: 'Architecture',
    blurb: 'How a modern transformer is put together — tokens, attention, caches, experts, precision.',
  },
  {
    id: 'compression',
    label: 'Compression',
    blurb: 'Making a pretrained model smaller without training it from scratch.',
  },
  {
    id: 'serving',
    label: 'Serving',
    blurb: 'The physics of fast inference — bandwidth, batching, memory, speculation.',
  },
  {
    id: 'alignment',
    label: 'Alignment',
    blurb: 'Post-training: shaping preferences and reasoning.',
  },
]

export interface ConceptChapter {
  id: string
  title: string
  Component: LazyExoticComponent<ComponentType>
}

export interface ConceptMeta {
  slug: string
  title: string
  tagline: string
  difficulty: Difficulty
  track: Track
  stage?: number
  chapters: ConceptChapter[]
}

export const difficultyColor: Record<Difficulty, string> = {
  beginner: 'text-good border-good/40 bg-good/10',
  intermediate: 'text-delta border-delta/40 bg-delta/10',
  advanced: 'text-bad border-bad/40 bg-bad/10',
}

export const trackAccent: Record<Track, string> = {
  architecture: 'text-accent',
  compression: 'text-delta',
  serving: 'text-good',
  alignment: 'text-bad',
}
