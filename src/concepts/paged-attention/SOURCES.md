# Sources

- Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention" (SOSP 2023, vLLM) — block-based KV cache, block tables, copy-on-write sharing; measured 2-4× throughput vs contiguous reservation. https://arxiv.org/abs/2309.06180
- vLLM block size 16 tokens (default) — from the paper and codebase.
- Pool arithmetic: 24 GB GPU − 15.24 GB FP16 weights → 10,251 16-token blocks using Qwen2.5-7B KV accounting (57,344 B/token) — computed in lib, verified (10,251 × 16 × 57,344 B = 9.4 GB).
- Waste model: contiguous strands ceil(max_ctx/B) − ceil(actual/B) blocks per sequence; paged loses only the unused tail of each sequence's final block. Seeded lengths; copy-on-write prefix sharing not modeled (stated in copy).
