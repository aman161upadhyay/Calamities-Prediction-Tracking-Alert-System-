# Sources and provenance

Research snapshot: 2026-10-25. Tier 1 is original research, first-party documentation or original author evidence. Tier 2 is named practitioner guidance. Procedures and thresholds are local design choices; no performance result is claimed.

| Title | URL | Author/org | Date | Tier | Contribution |
|---|---|---|---|---|---|
| LLM Council README and backend | https://github.com/karpathy/llm-council | Andrej Karpathy | HEAD 2025-11-22; checked 2026-10-25 | 1 | Parallel answers, ranking, synthesis; limitations and link-only status. |
| Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html | Zheng et al. | 2023 | 1 | Position, verbosity and self-enhancement bias. |
| LLMs cannot find reasoning errors, but can correct them given the error location | https://aclanthology.org/2024.findings-acl.826.pdf | Tyen, Mansoor, Carbune, Chen, Mak | 2024 | 1 | Separate detection and correction. |
| Large Language Models Cannot Self-Correct Reasoning Yet | https://openreview.net/forum?id=IkmD3fKBPQ | Huang et al. | ICLR 2024 | 1 | Intrinsic correction limits and baselines. |
| Improving Factuality and Reasoning through Multiagent Debate | https://proceedings.mlr.press/v235/du24e.html | Du et al. | ICML 2024 | 1 | Debate as a testable mechanism. |
| Finding GPT-4's mistakes with GPT-4 | https://openai.com/index/finding-gpt4s-mistakes-with-gpt-4/ | OpenAI | 2024-06-27 | 1 | Critique benefits and false findings. |
| Self-Refine | https://selfrefine.info/ | Madaan et al. | 2023 | 1 | Iterative feedback and revision. |
| Reflexion | https://arxiv.org/abs/2303.11366 | Shinn et al. | 2023 | 1 | Episodic verbal feedback. |
| Constitutional AI | https://arxiv.org/abs/2212.08073 | Bai et al., Anthropic | 2022-12 | 1 | Principle-conditioned training distinction. |
| Demystifying evals for AI agents | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents | Anthropic | 2026-01-09 | 1 | Outcome evidence and trials. |
| Your AI Product Needs Evals | https://hamel.dev/evals/ | Hamel Husain | 2024-03-29; living | 2 | Error analysis first. |
| LLM-as-a-Judge guide | https://hamel.dev/blog/posts/llm-judge/ | Hamel Husain | Living; revision unverified | 2 | Expert labels and calibration. |
| Product Evals in Three Simple Steps | https://eugeneyan.com/writing/product-evals/ | Eugene Yan | Date unverified | 2 | Swapped pairwise order. |
| Define success criteria and build evaluations | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests | Anthropic | Living | 1 | Rubrics and evidence-first grading. |
| Performing a Project Premortem | https://hbr.org/2007/09/performing-a-project-premortem | Gary Klein | 2007-09 | 1 | Dissent; retrieved page partial. |
| Identifying and Cultivating Superforecasters | https://web.stanford.edu/~knutson/jdm/mellers15.pdf | Mellers et al. | 2015 | 1 | Human calibration and resolvable forecasts. |
| Advancing red teaming with people and AI | https://openai.com/index/advancing-red-teaming-with-people-and-ai/ | OpenAI | 2024-11-21 | 1 | Authorized campaigns and expert review. |
| Many-shot jailbreaking | https://www.anthropic.com/news/many-shot-jailbreaking | Anthropic | 2024-04-02 | 1 | Long-context attacks and limits. |

Build inputs: `PRINCIPLES.md` section 6 and `work/research/08-council-and-evals.md`; domain cases adapt the independently authored eval designs in research notes 03, 04, 05, 06, 07 and 09. Those research files are provenance, not runtime dependencies.

No upstream code or assets are vendored. The council clone was inspected at `92e1fccb1bdcf1bab7221aa9ed90f9dc72529131`; no root license was found. Descriptions here are independent summaries. Public development fixtures are authored synthetic cases, not production traces or measured model results.
