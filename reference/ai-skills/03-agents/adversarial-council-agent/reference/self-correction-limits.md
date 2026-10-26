# Finding and fixing errors are different tasks

[Tyen et al., ACL Findings 2024](https://aclanthology.org/2024.findings-acl.826.pdf) separate detecting reasoning errors from correcting them after the location is supplied. Oracle error locations limit what correction results imply about autonomous review.

[Huang et al., ICLR 2024](https://openreview.net/forum?id=IkmD3fKBPQ) find that intrinsic reasoning self-correction can degrade answers. [Du et al., ICML 2024](https://proceedings.mlr.press/v235/du24e.html) report debate gains on their tasks. Different baselines, feedback and costs prevent a universal conclusion that more discussion improves truth.

[Self-Refine](https://selfrefine.info/) iterates feedback and revision. [Reflexion](https://arxiv.org/abs/2303.11366) carries verbal feedback into later attempts through episodic memory. [Constitutional AI](https://arxiv.org/abs/2212.08073) uses principle-conditioned critique and revision within training. These are distinct mechanisms, not interchangeable evidence for a generic critic prompt.

[OpenAI's CriticGPT account](https://openai.com/index/finding-gpt4s-mistakes-with-gpt-4/), 2024-06-27, reports assisted critique benefits but also hallucinated problems and difficulty with dispersed errors. A specialized trained critic does not validate an ordinary role prompt.

Measure defect recall and clean-artifact false positives. Track repairs that break correct behavior and errors introduced by synthesis. Compare single-model, self-refine, independent-sample selection and council conditions at matched cost. Keep critic, repairer and verifier contexts separate.
