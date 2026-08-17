import type { ComponentType, LazyExoticComponent } from 'react'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

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
  chapters: ConceptChapter[]
}

export const difficultyColor: Record<Difficulty, string> = {
  beginner: 'text-good border-good/40 bg-good/10',
  intermediate: 'text-delta border-delta/40 bg-delta/10',
  advanced: 'text-bad border-bad/40 bg-bad/10',
}
