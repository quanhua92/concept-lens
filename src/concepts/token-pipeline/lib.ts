import { addMat, initAttentionWeights, initEmbeddings, matmul, singleHeadAttention, transpose, type Mat } from '@/lib/math'

export const CORPUS = [
  'the cat sat on the mat',
  'the dog ran in the park',
  'the sun was hot',
  'a big red cat ran',
  'the cat ran in the park',
  'a dog sat on the mat',
]

export const TEST_PHRASE = 'the cat sat on the mat'

export interface MergeStep {
  pair: [string, string]
  merged: string
  count: number
}

function wordToChars(word: string): string[] {
  return [...word, '</w>']
}

export function trainBPE(corpus: string[], maxMerges: number): MergeStep[] {
  let words: string[][] = corpus.flatMap((line) => line.split(' ')).map(wordToChars)
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
    const [left, right] = bestKey.split('\u0000')
    const merged = left + right
    words = words.map((w) => {
      const out: string[] = []
      let i = 0
      while (i < w.length) {
        if (i < w.length - 1 && w[i] === left && w[i + 1] === right) {
          out.push(merged)
          i += 2
        } else {
          out.push(w[i])
          i += 1
        }
      }
      return out
    })
    merges.push({ pair: [left, right], merged, count: bestCount })
  }
  return merges
}

export function applyBPE(text: string, merges: MergeStep[], limit: number): string[] {
  const words = text.split(' ').map(wordToChars)
  const applied = merges.slice(0, limit)
  return words.flatMap((w) => {
    let cur = w
    for (const { pair, merged } of applied) {
      const out: string[] = []
      let i = 0
      while (i < cur.length) {
        if (i < cur.length - 1 && cur[i] === pair[0] && cur[i + 1] === pair[1]) {
          out.push(merged)
          i += 2
        } else {
          out.push(cur[i])
          i += 1
        }
      }
      cur = out
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
