# Sources

- Molchanov et al., "Pruning Convolutional Neural Networks for Resource Efficient Inference" (2017) — the Taylor expansion importance criterion |a·∂L/∂a| implemented in chapter 2. https://arxiv.org/abs/1706.04068
- Han et al., "Learning both Weights and Connections for Efficient Neural Networks" (2015) — magnitude pruning. https://arxiv.org/abs/1506.02626
- ShortGPT (Men et al., 2024) — layer deletion via Block Influence (Taylor idea applied between layers). https://arxiv.org/abs/2403.03853
- "The Unreasonable Ineffectiveness of the Deeper Layers" (Gromov, 2024) — depth pruning of LLMs + recovery. https://arxiv.org/abs/2403.17887
- Qwen2.5-7B config for the census (vocab 151,936, d 3584, 28 layers, 28/4 heads, ffn 18,944, untied head) — official config.json; the computed total matches the 7.62B model card. https://huggingface.co/Qwen/Qwen2.5-7B
- Chapter 2's network is genuinely trained in-browser (500 steps of backprop, seeded); pruning, Taylor scoring, and recovery all run live on it.
