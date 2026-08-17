# Sources

- Williams et al., "Roofline: An Insightful Visual Performance Model for Multicore Architectures" (2009) — the roofline model. https://arxiv.org/abs/1904.09751 (original CACM paper)
- GPU specs (verified against vendor pages): NVIDIA A100 80GB SXM — 312 BF16 dense TFLOPS, 2,039 GB/s HBM2e; H100 SXM — 989 BF16 dense TFLOPS, 3,350 GB/s HBM3; RTX 4090 — 165 FP16 dense TFLOPS (FP32 accumulate), 1,008 GB/s. https://www.nvidia.com/data-center/a100/ / colfax-intl.com H100 page
- Prefill compute-bound vs decode bandwidth-bound: Yu et al., Orca (2022); standard LLM serving analyses. https://arxiv.org/abs/2207.06051
- Qwen2.5-7B constants as in the kv-cache concept (7.62B params, GQA KV 57,344 B/token).
- FLOPs model: 2P per token forward + 2·d·ctx·L attention; tok/s = BW ÷ bytes is the bandwidth-only ceiling — real engines reach 70–85% of it (stated in copy).
