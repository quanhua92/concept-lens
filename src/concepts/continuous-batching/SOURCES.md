# Sources

- Yu et al., "Orca: A Distributed Serving System for Transformer-Based Generative Models" (OSDI 2022) — iteration-level (continuous) scheduling + selective batching; the static-batching tail-waste analysis this chapter simulates. https://arxiv.org/abs/2207.06051
- Kwon et al., "Efficient Memory Management for LLM Serving with PagedAttention" (SOSP 2023, vLLM) — productionized continuous batching. https://arxiv.org/abs/2309.06180
- Iteration-time model reuses the roofline concept's arithmetic (Qwen2.5-7B weights 15.24 GB, KV 57,344 B/token, 4090 1,008 GB/s) — computed, not fitted.
- The simulator is a deterministic discrete-event scheduler (seeded arrivals/lengths); both modes process identical request streams. Static mode models idle-slot waste but not padding overhead (stated in copy — padding would only widen the gap).
