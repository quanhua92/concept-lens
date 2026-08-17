# Sources

- Micikevicius et al., "FP8 Formats for Deep Learning" (2022) — OCP FP8 spec: E4M3 (max finite 448, no infinities) and E5M2 (max 57,344, inf/nan), round-to-nearest-even. Implemented bit-exactly in the site's encoder. https://arxiv.org/abs/2209.05433
- DeepSeek-AI, "DeepSeek-V3 Technical Report" (2024) — FP8 mixed-precision training: per-tensor scaling plus fine-grained tile/block scales, 448 as E4M3 cap, trained 14.8T tokens. https://arxiv.org/abs/2412.19437
- Sun et al., "Ultra-Low Precision Training" / NVIDIA Transformer Engine docs — per-tensor amax scaling practice. https://arxiv.org/abs/2305.17433
- Gloeckle et al., "Better & Faster Large Language Models via Multi-token Prediction" (2024) — independent MTP paper. https://arxiv.org/abs/2404.19737
- DeepSeek-V3 report §2.4 (MTP) — MTP modules sharing the trunk's hidden state, used at inference for speculative decoding; "the first token is always kept" acceptance semantics.
- Expected tokens/pass formula E[T] = 1 + Σ_{k=1..K} β^k under i.i.d. acceptance — standard speculative-decoding arithmetic (also derived in Leviathan et al., 2023).

Notes: the bit explorer runs the site's own E4M3/E5M2/FP16/BF16 encoders (verified against hand values); the scaling chapter plants outliers in seeded Gaussian data; the MTP acceptance demo uses a single tunable β for clarity — the speculative-decoding concept computes acceptance from real distributions.
