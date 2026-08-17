import { useState } from 'react'
import { Callout, Formula, Toggle } from '@/components/ui'
import { HeatmapGrid } from '@/components/viz'
import { fmt } from '@/lib/utils'
import { TOKENS, dropHeads, relativeChange, useHeadRun } from '../lib'

export default function ViewpointsChapter() {
  const H = 4
  const { result, wo } = useHeadRun(31, H)
  const [active, setActive] = useState<boolean[]>(() => new Array(H).fill(true))
  const full = result.out
  const current = dropHeads(result, active, 8, H, wo)
  const change = relativeChange(full, current)
  const activeCount = active.filter(Boolean).length

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        One attention head produces one distribution per token — one opinion about what matters.
        Real transformers run many in parallel. Because each head has its own{' '}
        <code className="rounded bg-panel-2 px-1 font-mono text-xs text-accent">W<sub>Q</sub>/W<sub>K</sub>/W<sub>V</sub></code>{' '}
        slices, each learns a different comparison — syntax, position, repetition, topic. Their
        outputs are concatenated and mixed by W<sub>O</sub>.
      </p>

      <Formula caption="Each head runs the full attention you already know — independently, on its own slice of dimensions.">
        head<sub>h</sub> = Attention(Q<sub>h</sub>, K<sub>h</sub>, V<sub>h</sub>)&emsp;out = concat(head<sub>1..H</sub>) · W<sub>O</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <p className="mb-4 text-xs text-dim">
          4 heads on 6 tokens — each panel is that head’s real attention matrix (causal). Toggle
          heads off and watch the output shift.
        </p>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {result.heads.map((h, i) => (
            <div key={i} className={active[i] ? '' : 'opacity-40'}>
              <div className="mb-2">
                <Toggle
                  label={`head ${i + 1}`}
                  checked={active[i]}
                  onChange={(v) => setActive((a) => a.map((x, j) => (j === i ? v : x)))}
                />
              </div>
              <HeatmapGrid
                values={h.attn}
                rowLabels={TOKENS}
                colLabels={TOKENS}
                ariaLabel={`head ${i + 1} attention`}
                className="text-[9px]"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-line bg-panel-2 p-4">
          <p className="font-mono text-xs text-mute">
            output with {activeCount}/{H} heads — relative change vs full:{' '}
            <span className={change < 0.05 ? 'text-good' : change > 0.5 ? 'text-bad' : 'text-delta'}>
              {fmt(change * 100, 1)}%
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-dim">
            {activeCount === H
              ? 'All heads on — this is the block’s full output.'
              : activeCount === 0
                ? 'Every head off — no information flows through attention at all.'
                : 'Remaining heads still produce a valid output — just a poorer mixture of viewpoints. This is exactly how head-pruning works (compression track, stage 9).'}
          </p>
        </div>
      </div>

      <Callout variant="idea">
        Heads are <em>parallel opinions with separate geometries</em>. Different W<sub>Q</sub>·W<sub>K</sub>{' '}
        pairs mean different similarity measures; different W<sub>V</sub> means different content
        extracted. W<sub>O</sub> learns how to combine the committee.
      </Callout>
      <Callout variant="note">
        Weights here are random, so patterns differ by initialization, not by learned role. In
        trained models, interpretable roles (induction heads, positional heads) emerge from
        training — the mechanism shown here is exactly what they run.
      </Callout>
    </div>
  )
}
