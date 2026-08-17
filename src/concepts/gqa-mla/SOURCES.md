# Sources

- Ainslie et al., "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints" (2023) — grouped-query attention, quality within ~1% of MHA at 8× cache reduction, uptraining from MHA checkpoints. https://arxiv.org/abs/2305.13245
- Shazeer, "Fast Transformer Decoding: One Write-Head is All You Need" (2019) — MQA. https://arxiv.org/abs/1911.02150
- DeepSeek-AI, "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model" (2024) — MLA: joint low-rank KV compression (c_KV), decoupled RoPE with separate k_R, weight absorption at inference. https://arxiv.org/abs/2405.04434
- DeepSeek-AI, "DeepSeek-V3 Technical Report" (2024) — V3 dims verified: 61 layers, 128 heads, head_dim 128, d_model 7168, d_c 512, d_R 64 → 576 cached elements/token/layer ≈ 57× smaller than MHA's 32,768. https://arxiv.org/abs/2412.19437
- Qwen2.5-7B config (28 query heads, 4 KV heads, 128 head dim) — official config.json. https://huggingface.co/Qwen/Qwen2.5-7B
- The bottleneck error curve in chapter 2 is computed live in-browser (random projections); the "training aligns the latent with useful directions" claim is qualitative (from the V2 ablations).
