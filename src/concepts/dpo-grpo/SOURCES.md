# Sources

- Rafailov et al., "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (2023) — L = −log σ(β[log π(y_w)/π_ref(y_w) − log π(y_l)/π_ref(y_l)]); the loss/gradient curves in chapter 1 are this formula evaluated live. https://arxiv.org/abs/2305.18290
- Shao et al., "DeepSeekMath: Pushing the Limits of Mathematical Reasoning" (2024) — GRPO: group-sampled advantages A_i = (r_i − mean)/std, no critic, KL-to-reference penalty. https://arxiv.org/abs/2402.03300
- DeepSeek-AI, "DeepSeek-R1" (2025) — GRPO with verifiable rewards for reasoning training. https://arxiv.org/abs/2501.12948
- Ouyang et al., "Training language models to follow instructions with human feedback" (2022) — the RLHF pipeline DPO collapses. https://arxiv.org/abs/2203.02155
- Chapter 2 runs the exact GRPO advantage estimator and KL-regularized policy gradient on a 4-armed bandit (sequence-level special case, stated in copy); verified: reward 0.8→1.4, KL leash bounds drift at high β.
