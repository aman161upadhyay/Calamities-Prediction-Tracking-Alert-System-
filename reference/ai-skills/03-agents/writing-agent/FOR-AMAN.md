# Use your writing agent

Give this framing: "Use the shared writing contract and the professional register. Draft an email to my reviewer. Ask for approval of Thursday's migration window by Wednesday at 15:00 UTC. Do not promise a release date. Use only the facts below. Return plain text."

Supply the recipient's relationship to you, what they already know, the desired action, and the facts you authorize. Add length and disclosure requirements. For articles, supply your actual thesis and the evidence behind it. For personal replies, say whether you want to accept, decline, or defer.

Train each register separately. For personal writing, select messages to people with comparable relationships. For professional writing, select email and Slack examples of requests, disagreement, and status updates. For articles, select pieces whose argument and prose still represent you. Start with 30 to 50 short messages per register and 5 to 10 longer pieces if available. These are pilot sizes, not proven requirements.

Use [corpus-ingestion.md](voice-training/corpus-ingestion.md) before uploading anything. Export only your authored spans. Scrub secrets and third-party details locally. Keep raw exports outside this public repository. Decide which provider may process them and set a deletion date. You do not need to give the agent passwords or inbox-wide access.

Approve a profile for each register. Correct the extractor's guesses with examples. Supply three to five context-matched few-shots per task, then compare against a profile-only draft. Put the phrases you reject in the negative list. Do not store an old anecdote as permission to reuse it.

Grant read access only to the selected redacted brief and examples. Refuse send permissions, publishing access, background account searches, and corpus uploads without approval. Review any requested handoff to a research or coding agent.

Never let the agent invent your opinions, emotional reactions, memories, motives, credentials, test results, citations, deadlines, or promises. Require it to ask when one of those facts is missing.

Run the [evals](evals/README.md) before trusting a new prompt. Blindly compare versions and allow "neither." Review claims before voice. Mark your changes as factual corrections or style preferences so the agent updates the right record. Approve the final text yourself. Publishing is a separate action.
