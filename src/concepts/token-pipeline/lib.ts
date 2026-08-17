import { addMat, initAttentionWeights, initEmbeddings, matmul, singleHeadAttention, transpose, type Mat } from '@/lib/math'

export const CORPUS = [
  'the cat sat on the mat.',
  "the dog ran; it's fast!",
  'the sun was hot.',
  'a big red cat ran 2 miles',
  'the cat ran in the park!',
  'a dog sat on the mat,',
]

export const TEST_PHRASE = "the cat sat on the mat. it's the dog's"

export interface Preset {
  label: string
  text: string
  note: string
}

export const PRESETS: Preset[] = [
  {
    label: 'basic',
    text: TEST_PHRASE,
    note: 'corpus words — watch merges fire',
  },
  {
    label: 'punct · digits · emoji',
    text: "it's 42 cats! 😀😀😀 wow",
    note: 'one emoji-chain pre-token explodes into pieces',
  },
  {
    label: 'long word',
    text: 'antidisestablishmentarianism strikes!',
    note: 'a rare word shatters into subwords',
  },
]

export const PRETOKENIZE_PATTERN =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

export function preTokenize(text: string): string[] {
  return text.match(new RegExp(PRETOKENIZE_PATTERN.source, 'gu')) ?? []
}

export const BYTE_SYMBOLS: string[] = (() => {
  const printable: number[] = []
  for (let i = 33; i < 127; i++) printable.push(i)
  for (let i = 161; i < 173; i++) printable.push(i)
  for (let i = 174; i < 256; i++) printable.push(i)
  const symbols = new Array<string>(256)
  let n = 0
  for (let b = 0; b < 256; b++) {
    symbols[b] = printable.includes(b)
      ? String.fromCharCode(b)
      : String.fromCharCode(256 + n++)
  }
  return symbols
})()

const SYMBOL_TO_BYTE: Map<string, number> = new Map(BYTE_SYMBOLS.map((s, b) => [s, b]))

export function encodeSymbols(preToken: string): string[] {
  return Array.from(new TextEncoder().encode(preToken), (b) => BYTE_SYMBOLS[b])
}

export function decodeSymbols(symbols: string[]): string {
  return new TextDecoder().decode(new Uint8Array(symbols.map((s) => SYMBOL_TO_BYTE.get(s) ?? 63)))
}

const BYTE_NAME: Record<string, string> = { 'Ġ': '␣', 'Ċ': '⏎', 'ĉ': '⇥' }

export function symbolName(s: string): string {
  return BYTE_NAME[s] ?? s
}

export function displayToken(symbols: string): string {
  try {
    const bytes = Uint8Array.from([...symbols], (ch) => SYMBOL_TO_BYTE.get(ch) ?? 63)
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return text.replace(/ /g, '␣').replace(/\n/g, '⏎').replace(/\t/g, '⇥')
  } catch {
    return [...symbols].map(symbolName).join('')
  }
}

export interface MergeStep {
  pair: [string, string]
  merged: string
  count: number
}

function mergeWithin(pieces: string[], pair: [string, string], merged: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < pieces.length) {
    if (i < pieces.length - 1 && pieces[i] === pair[0] && pieces[i + 1] === pair[1]) {
      out.push(merged)
      i += 2
    } else {
      out.push(pieces[i])
      i += 1
    }
  }
  return out
}

export function trainBPE(corpus: string[], maxMerges: number): MergeStep[] {
  let words: string[][] = corpus.flatMap((line) => preTokenize(line)).map((pre) => encodeSymbols(pre))
  const merges: MergeStep[] = []
  for (let m = 0; m < maxMerges; m++) {
    const counts = new Map<string, number>()
    for (const w of words) {
      for (let i = 0; i < w.length - 1; i++) {
        const key = `${w[i]}\u0000${w[i + 1]}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    let bestKey: string | null = null
    let bestCount = 0
    for (const [key, count] of counts) {
      if (count > bestCount || (count === bestCount && key < (bestKey ?? '~'))) {
        bestKey = key
        bestCount = count
      }
    }
    if (!bestKey || bestCount < 2) break
    const pair = bestKey.split('\u0000') as [string, string]
    const merged = pair[0] + pair[1]
    words = words.map((w) => mergeWithin(w, pair, merged))
    merges.push({ pair, merged, count: bestCount })
  }
  return merges
}

export function applyBPEGrouped(text: string, merges: MergeStep[], limit: number): string[][] {
  return preTokenize(text).map((pre) => {
    let cur = encodeSymbols(pre)
    for (const { pair, merged } of merges.slice(0, limit)) {
      cur = mergeWithin(cur, pair, merged)
    }
    return cur
  })
}

export interface InputAnalysis {
  bestPair: { pair: [string, string]; count: number } | null
  firingMerges: MergeStep[]
}

export function analyzeInput(text: string, merges: MergeStep[], limit: number): InputAnalysis {
  const counts = new Map<string, number>()
  for (const pre of preTokenize(text)) {
    const syms = encodeSymbols(pre)
    for (let i = 0; i < syms.length - 1; i++) {
      const key = `${syms[i]}\u0000${syms[i + 1]}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  let bestPair: InputAnalysis['bestPair'] = null
  for (const [key, count] of counts) {
    if (!bestPair || count > bestPair.count) {
      const [l, r] = key.split('\u0000')
      bestPair = { pair: [l, r], count }
    }
  }
  const present = new Set(counts.keys())
  const firingMerges = merges
    .slice(0, limit)
    .filter((m) => present.has(`${m.pair[0]}\u0000${m.pair[1]}`))
  return { bestPair, firingMerges }
}

export const VOCAB = [
  'the', 'cat', 'sat', 'on', 'mat', 'dog', 'ran', 'a',
  'in', 'park', 'sun', 'was', 'hot', 'big', 'red', '.',
]

export interface TinyLM {
  emb: Mat
  weights: ReturnType<typeof initAttentionWeights>
  proj: Mat
}

export function makeTinyLM(seed: number): TinyLM {
  const emb = initEmbeddings(seed, VOCAB.length, 8)
  const weights = initAttentionWeights(seed + 5, 8)
  const proj = initEmbeddings(seed + 9, 8, VOCAB.length)
  return { emb, weights, proj }
}

export function lmForward(lm: TinyLM, ids: number[]): { logits: number[]; attn: Mat; x: Mat } {
  const x0: Mat = ids.map((i) => lm.emb[i])
  const trace = singleHeadAttention(x0, lm.weights.wq, lm.weights.wk, lm.weights.wv)
  const x = addMat(x0, trace.delta)
  const h = x[x.length - 1]
  const logits = matmul([h], lm.proj)[0]
  return { logits, attn: trace.attn, x }
}

export function idsToTokens(ids: number[]): string[] {
  return ids.map((i) => VOCAB[i] ?? '?')
}

export { matmul, transpose }
