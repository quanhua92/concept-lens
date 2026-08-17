# Sources

- Sennrich et al., "Neural Machine Translation of Rare Words with Subword Units" (2016) — the BPE merge algorithm. https://arxiv.org/abs/1508.07909
- Radford et al., GPT-2 (2019) — byte-level BPE with the regex pre-tokenizer implemented here: `'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+`. https://github.com/openai/gpt-2/blob/master/src/encoder.py
- Karpathy, minbpe — clean reference implementation of GPT-2-style pre-tokenization + BPE. https://github.com/karpathy/minbPE
- Qwen team, "Qwen2.5 Blog" — ~150k-token vocabulary, tiktoken-style BPE with the same pre-tokenizer family. https://qwenlm.github.io/blog/qwen2.5/
- Holtzman et al., "The Curious Case of Neural Text Degeneration" (2019) — nucleus (top-p) sampling. https://arxiv.org/abs/1904.09751
- Fan et al. (2018) — top-k sampling.

Notes: the in-browser encoder replicates GPT-2 inference exactly — the pre-tokenizer regex, byte-level encoding via the original bytes_to_unicode mapping (Ġ = space, 😀 = 4 byte-symbols), and rank-ordered merging against a frozen merge table (learned once from the tiny corpus, never adapted to input). The vocab-size slider selects how many frozen ranks exist; 0 = pure byte-level vocab (256). Explosion cases (emoji chains, rare long words) are the honest consequence of pairs that never earned ranks. The tiny LM uses random (untrained) weights — stated in copy.
