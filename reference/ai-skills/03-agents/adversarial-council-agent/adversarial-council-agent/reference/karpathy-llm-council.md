# Karpathy's LLM Council

Karpathy's council illustrates parallel answers, anonymized peer ranking and chairman synthesis. It is an idea reference, not this repository's runtime.

Source: Andrej Karpathy, [README](https://github.com/karpathy/llm-council/blob/master/README.md) and [backend](https://github.com/karpathy/llm-council/blob/master/backend/council.py), inspected commit `92e1fccb1bdcf1bab7221aa9ed90f9dc72529131`, HEAD dated 2025-11-22, research checked 2026-10-25.

The first stage sends the same current query to configured models in parallel through OpenRouter. The second presents candidate answers under letter labels and asks each model to rank them. The third sends answers and reviews to one chairman for a final response.

The inspected implementation includes each judge's own answer. All judges see the same order. Model identities are visible to the chairman. Parsed average ranks are display statistics, not correctness estimates. Parsing does not enforce a complete unique ballot; unequal coverage can distort aggregation.

The implementation does not supply artifact reproduction, separate repair verification or calibrated human labels. Provider failures can reduce participation without a minimum quorum. A request timeout is not a total spending ceiling. Stored conversation history does not establish multi-turn council memory because the orchestration receives the current request content.

The README describes an unsupported project. No root license was found in the inspected clone. Redistribution permission was not verified, so no code or assets are copied. Public visibility and popularity do not grant a license. Aman's protocol independently specifies no self-ballots, counterbalanced order, blind chairman input and explicit budgets.
