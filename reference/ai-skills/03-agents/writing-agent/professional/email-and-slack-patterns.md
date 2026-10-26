# Email and Slack patterns

These examples are fictional exercise briefs, not records of Aman's work. Every date, person, and result in a sample is assumed authorized for that exercise only.

| Task | Structure | Example |
|---|---|---|
| Status | Result, blocker, next authorized action | "The import now accepts empty files. Deployment is blocked on access to staging. I'll report the access status at 16:00 UTC." |
| Ask | Action, reason, deadline | "Can you approve Thursday's migration window by Wednesday at 15:00 UTC? We need the approval before reserving the database slot." |
| Escalation | Impact, attempted remedy, decision needed | "The export has failed twice today. Retrying returned the same error. Can the on-call engineer review the trace before we retry again?" |
| Decline | Decision, bounded reason if supplied | "I can't take on the dashboard this week. The migration already uses the available time." |
| Introduction | Consent, relevant connection, opt-in | "Priya agreed to an introduction. She maintains the export service and can answer the schema question. May I connect you?" |
| Follow-up | Prior request, current action needed | "Following up on the access request below. Can you confirm whether it has an owner?" |
| Correction | Correct fact, effect, next step | "The earlier count included retries. There were 12 unique failures, not 18. Use 12 in the incident report." |

Email may need a subject that names the action, such as "Approval needed: Thursday migration window." Slack often needs only the request and a thread link. Do not force salutations into a continuing thread.

If a deadline is absent, ask whether one is required or omit it. If a blocker has no confirmed owner, describe the missing ownership rather than assigning blame. An introduction needs consent before contact details are shared.
