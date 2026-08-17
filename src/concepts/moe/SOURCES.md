# Sources

- Shazeer et al., "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer" (2017) — top-k routing, load-balancing objective. https://arxiv.org/abs/1701.06538
- Fedus et al., "Switch Transformers" (2021) — the f_i·P_i auxiliary loss form implemented in chapter 2. https://arxiv.org/abs/2101.03961
- DeepSeek-AI, "DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models" (2024) — fine-grained expert segmentation + shared expert isolation. https://arxiv.org/abs/2401.06066
- DeepSeek-AI, "DeepSeek-V3 Technical Report" (2024) — deployed config verified: 1 shared + 256 routed experts, top-8, sigmoid gating, auxiliary-loss-free balancing via per-expert bias update, complementary sequence-wise aux loss α=0.0001, 3 dense + 58 MoE layers, 671B total / 37B active, expert intermediate 2048. https://arxiv.org/abs/2412.19437
- Chapter 2's balanced run is a real gradient descent on router logits under the Switch aux loss (sigmoid affinities, V3-style top-k + gate renormalization). The collapse run is an explicit toy positive-feedback model of the winner-takes-all training failure — labeled as such in the copy.
