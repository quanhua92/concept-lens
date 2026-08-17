# Sources

- Vaswani et al., "Attention Is All You Need" (2017) — scaled dot-product attention; footnote 4 is the source of the √dₖ variance argument demonstrated in chapter 2 ("dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients"). https://arxiv.org/abs/1706.03762
- The variance claim (Var(q·k) = dₖ for unit-variance components) is verified empirically in-browser: chapter 2's chart is a live experiment over seeded random vectors, not a hardcoded trend.
- Causal masking convention (−∞ before softmax) — standard decoder-only practice; same formulation as in the GPT-2 forward pass.
