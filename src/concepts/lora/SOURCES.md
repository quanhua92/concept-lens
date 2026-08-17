# Sources

- Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (2021) — B·A parameterization, B zero-init / A Gaussian init, α/r scaling, merged inference with zero overhead; the intrinsic-rank observation about fine-tune deltas. https://arxiv.org/abs/2106.09685
- Liu et al., "DoRA: Weight-Decomposed Low-Rank Adaptation" (2024) — magnitude/direction decomposition. https://arxiv.org/abs/2402.09353
- Raschka, "LoRA and DoRA from scratch" + rank/alpha FAQ — practical α=2r convention. https://sebastianraschka.com/blog/2023/lora-from-scratch.html
- Hayou et al., "The Impact of Initialization on LoRA Finetuning Dynamics" (2024) — zero-init analysis. https://arxiv.org/abs/2406.08447
- Qwen2.5-7B config for param census (as in the pruning concept).
- The rank experiment computes true SVD truncations in-browser via power iteration with deflation (verified: exact rank-5 matrix reconstructs at machine precision, 3.4e-16); the structured update is a constructed rank-5 + 6% noise matrix, labeled as such — real fine-tune spectra are the paper's empirical claim.
