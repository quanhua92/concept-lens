# Sources

- Frantar et al., "GPTQ: Accurate Post-Training Quantization for Generative LLMs" (2022) — second-order calibration, outlier handling. https://arxiv.org/abs/2210.17323
- Lin et al., "AWQ: Activation-aware Weight Quantization" (2023) — per-channel scaling to protect outlier channels. https://arxiv.org/abs/2306.00978
- Dettmers et al., "LLM.int8()" (2022) — the outlier-feature observation. https://arxiv.org/abs/2208.07339
- Xiao et al., SmoothQuant (2022) — migrating quantization difficulty weights→activations. https://arxiv.org/abs/2211.10438
- The grid chapter runs real symmetric per-group round-to-grid (quantizeSym in lib/math, spot-checked earlier); the serving chapter reuses the roofline tok/s model with Qwen2.5-7B / 4090 constants.
