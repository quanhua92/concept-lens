import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Callout, Formula, Slider } from '@/components/ui'
import { fmt } from '@/lib/utils'
import { initRouterLogits, makeTokenFeatures, routeBatch } from '../lib'
import { mulberry32 } from '@/lib/math'

const N_EXPERTS = 8
const N_TOKENS = 48

export default function RoutingChapter() {
  const [topK, setTopK] = useState(2)
  const logits = useMemo(() => initRouterLogits(4, N_EXPERTS), [])
  const feats = useMemo(() => makeTokenFeatures(11, N_TOKENS, N_EXPERTS), [])

  const batch = useMemo(() => routeBatch(logits, feats, topK, mulberry32(1)), [logits, feats, topK])

  return (
    <div className="space-y-8">
      <p className="text-[15px] leading-relaxed text-mute">
        The MLP layers are where most parameters live. A{' '}
        <strong className="text-zinc-100">mixture-of-experts</strong> layer replaces one big MLP
        with many small ones and a tiny router that picks a few per token. Every token gets its own
        subset — the model gets bigger without getting slower.
      </p>

      <Formula caption="DeepSeek-V3 style routing: affinity = sigmoid(router score), take top-K, renormalize the gates among the winners. Output = Σ gate_i · Expert_i(x).">
        y = Σ<sub>i∈topK</sub> g<sub>i</sub> · FFN<sub>i</sub>(x),&emsp;g<sub>i</sub> = s<sub>i</sub> / Σ<sub>topK</sub> s<sub>j</sub>
      </Formula>

      <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
        <Slider
          label="experts per token (top-K)"
          value={topK}
          min={1}
          max={8}
          onChange={setTopK}
          format={(v) => `${v}`}
          hint={`Each token activates ${topK}/${N_EXPERTS} experts = ${fmt((topK / N_EXPERTS) * 100, 0)}% of the layer's MLP capacity.`}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 24 }, (_, t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-10 text-right font-mono text-[10px] text-dim">tok {t}</span>
                <div className="flex gap-1">
                  {Array.from({ length: N_EXPERTS }, (_, e) => {
                    const d = batch.decisions[t]
                    const slot = d.chosen.indexOf(e)
                    const gate = slot >= 0 ? d.gates[slot] : 0
                    return (
                      <motion.span
                        key={e}
                        animate={{ opacity: gate > 0 ? 1 : 0.13 }}
                        className="flex h-5 w-6 items-center justify-center rounded-[4px] font-mono text-[9px]"
                        style={{
                          backgroundColor: gate > 0 ? `rgba(245, 158, 11, ${0.25 + gate * 0.7})` : '#1a1a21',
                          color: gate > 0 ? '#0a0a0c' : '#52525b',
                        }}
                        title={gate > 0 ? `expert ${e + 1}, gate ${gate.toFixed(2)}` : 'not chosen'}
                      >
                        {gate > 0 ? gate.toFixed(1) : ''}
                      </motion.span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-dim">expert load ({N_TOKENS} tokens routed)</p>
            {batch.loads.map((l, e) => (
              <div key={e} className="flex items-center gap-2">
                <span className="w-12 font-mono text-[10px] text-dim">E{e + 1}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-panel-2">
                  <motion.div
                    animate={{ width: `${(l / N_TOKENS) * 100 * 2}%` }}
                    className="h-full rounded bg-delta"
                  />
                </div>
                <span className="w-8 font-mono text-[10px] text-mute">{l}</span>
              </div>
            ))}
            <p className="pt-1 font-mono text-[10px] text-dim">
              balanced target: {(N_TOKENS * topK / N_EXPERTS).toFixed(0)} tokens each · max now{' '}
              <span className={Math.max(...batch.loads) > N_TOKENS * topK / N_EXPERTS * 1.6 ? 'text-bad' : 'text-good'}>
                {Math.max(...batch.loads)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <Callout variant="idea">
        The magic sentence: <em>parameters ≠ compute</em>. DeepSeek-V3 has 671B parameters but each
        token computes with only 37B — the router makes most of the model dormant for any given
        input, while different tokens wake up different parts.
      </Callout>
      <Callout variant="note">
        Router scores here are seeded random logits plus per-token affinity noise (sigmoid gating,
        exactly V3’s shape). Real routers learn affinities — syntax to some experts, code to
        others — but the selection and normalization mechanics shown are the deployed ones.
      </Callout>
    </div>
  )
}
