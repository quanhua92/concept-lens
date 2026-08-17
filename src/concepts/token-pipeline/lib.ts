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

export const PRETOKENIZE_PATTERN =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

export function preTokenize(text: string): string[] {
  return text.match(new RegExp(PRETOKENIZE_PATTERN.source, 'gu')) ?? []
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
  let words: string[][] = corpus.flatMap((line) => preTokenize(line)).map((pre) => [...pre])
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
    let cur = [...pre]
    for (const { pair, merged } of merges.slice(0, limit)) {
      cur = mergeWithin(cur, pair, merged)
    }
    return cur
  })
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
