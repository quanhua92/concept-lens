# Sources

- Leviathan et al., "Fast Inference from Transformers via Speculative Decoding" (2023) — the accept rule min(1, p/q), residual resampling norm(max(0, p−q)), E[T] = (1−α^{γ+1})/(1−α), and the distribution-invariance theorem. https://arxiv.org/abs/2211.17192
- Chen et al., "Accelerating Large Language Model Decoding with Speculative Sampling" (2023) — independent derivation (DeepMind). https://arxiv.org/abs/2302.01318
- SpecDec/Medusa/EAGLE (2023–24) — adaptive draft lengths, tree drafts; MTP connection via DeepSeek-V3.
- All verification in-browser: the accept/reject loop is the real algorithm on seeded distributions; empirical acceptance matched the closed form Σ min(p,q) to ~0.002 over 2,000 passes; the output-distribution theorem checked by total variation distance ≈ 0.011 over 4,000 passes with a λ=0.6 draft (uniform draft would be ~0.4).
