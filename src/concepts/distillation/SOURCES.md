# Sources

- Hinton et al., "Distilling the Knowledge in a Neural Network" (2015) — temperature-softened distributions as targets, dark knowledge. https://arxiv.org/abs/1503.02531
- Forward vs reverse KL mode-covering/mode-seeking behavior — standard result; e.g., Shannon-theory treatments and the GAN/VAE literature (reverse KL in the ELBO).
- Sheared-LLaMA (Xia et al., 2023) — targeted structural pruning + distillation recovery of LLMs. https://arxiv.org/abs/2310.06694
- Meta Llama 3.2 (2024) — pruning + distillation to build 1B/3B from larger checkpoints. https://arxiv.org/abs/2410.21285
- Chapter 3's recovery loop genuinely re-trains the pruned network in-browser (soft cross-entropy at temperature T against the unpruned teacher's logits, seeded); the KL chapter numerically integrates both divergences over the plotted Gaussians.
