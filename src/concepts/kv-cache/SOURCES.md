# Sources

- KV cache mechanism: standard in all LLM inference engines; see vLLM and the original Transformer decoder — K/V for the prefix are invariant across decode steps, so they are computed once (prefill) and appended per token.
- Qwen2.5-7B constants (28 layers, 4 KV heads, 128 head dim, d=3584, ~7.6B params) — official config.json. https://huggingface.co/Qwen/Qwen2.5-7B
- Prefill compute-bound vs decode bandwidth-bound framing — Orca (Yu et al., 2022) iteration-level scheduling paper, and every roofline treatment of LLM serving. https://arxiv.org/abs/2207.06051
- FLOPs model: 2·P per token (2 FLOPs per parameter per token, forward) — standard Kaplan/PaLM accounting; attention adds 2·d·t·L, included in the decode chart.
- GPU figures (24 GB consumer card, FP16 weights ≈ 14.2 GB for 7.6B params) — arithmetic from cited constants.
