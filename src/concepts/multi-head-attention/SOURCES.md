# Sources

- Vaswani et al., "Attention Is All You Need" (2017), §3.2.2 — multi-head attention: "Instead of performing a single attention function with d_model-dimensional keys, values and queries, we linearly project them h times" — the view/split mechanism in chapter 2. https://arxiv.org/abs/1706.03762
- Head scaling uses 1/√dₕ per head (dₕ = d/H), consistent with the paper's ScaledDotProductAttention applied per head.
- Qwen2.5-7B config (28 heads, d=3584, dₕ=128) verified from the official config.json. https://huggingface.co/Qwen/Qwen2.5-7B
- Head-pruning connection: Michel et al., "Are Sixteen Heads Really Better than One?" (2019). https://arxiv.org/abs/1905.10650
