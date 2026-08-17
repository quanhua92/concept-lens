export const QWEN = {
  name: 'Qwen2.5-7B',
  vocab: 151936,
  dModel: 3584,
  layers: 28,
  qHeads: 28,
  kvHeads: 4,
  headDim: 128,
  ffn: 18944,
  tieHead: false,
}

export interface CensusRow {
  label: string
  params: number
  formula: string
  color: string
}

export function census(cfg: typeof QWEN): { rows: CensusRow[]; total: number } {
  const kvDim = cfg.kvHeads * cfg.headDim
  const qProj = cfg.dModel * cfg.dModel
  const kvProj = cfg.dModel * kvDim * 2
  const attnPerLayer = qProj * 2 + kvProj
  const mlpPerLayer = 3 * cfg.dModel * cfg.ffn
  const rows: CensusRow[] = [
    {
      label: `attention × ${cfg.layers} layers`,
      params: attnPerLayer * cfg.layers,
      formula: `2·d² (Q,O) + 2·d·${kvDim} (K,V, GQA) = ${((attnPerLayer / 1e6) | 0)}M/layer`,
      color: '#22d3ee',
    },
    {
      label: `MLP × ${cfg.layers} layers`,
      params: mlpPerLayer * cfg.layers,
      formula: `3·d·ffn (gate, up, down) = ${((mlpPerLayer / 1e6) | 0)}M/layer`,
      color: '#f59e0b',
    },
    {
      label: 'token embeddings',
      params: cfg.vocab * cfg.dModel,
      formula: `${(cfg.vocab / 1000).toFixed(0)}k vocab × ${cfg.dModel}`,
      color: '#34d399',
    },
    {
      label: 'LM head',
      params: cfg.tieHead ? 0 : cfg.vocab * cfg.dModel,
      formula: cfg.tieHead ? 'tied with embeddings' : `untied: ${cfg.vocab} × d`,
      color: '#a1a1aa',
    },
  ]
  return { rows, total: rows.reduce((s, r) => s + r.params, 0) }
}
