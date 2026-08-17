# Sources

- Sennrich et al., "Neural Machine Translation of Rare Words with Subword Units" (2016) — the BPE merge algorithm implemented in chapter 1. https://arxiv.org/abs/1508.07909
- Radford et al., GPT-2 "Language Models are Unsupervised Multitask Learners" (2019) — byte-level BPE. https://d4mucfpksywv.cloudfront.net/better-language-models/language_models_are_unsupervised_multitask_learners.pdf
- Qwen team, "Qwen2.5 Blog" — ~150k-token vocabulary via tiktoken-style BPE. https://qwenlm.github.io/blog/qwen2.5/
- Holtzman et al., "The Curious Case of Neural Text Degeneration" (2019) — nucleus (top-p) sampling. https://arxiv.org/abs/1904.09751
- Fan et al. (2018) — top-k sampling.

Notes: the in-browser trainer uses character-level starts with a `</w>` word-end marker (classic Sennrich formulation), not bytes. The tiny LM uses random (untrained) weights — stated in copy.
