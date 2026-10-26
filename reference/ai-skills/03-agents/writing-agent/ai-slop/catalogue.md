# Editing catalogue

These 102 pairs are illustrative exercises, not Aman's experiences. The first 100 follow the newly written examples in research dossier 04, section 5a; two commit examples extend that set. The quoted before cells intentionally contain language prohibited in normal repository prose. Cue labels are descriptive. After cells sometimes require facts absent from the before cell: those facts are assumed supplied by the exercise brief. In real work, ask for them or omit the detail. Never use this table as an automatic substitution dictionary.

Sources: [source register](../sources.md), [Wikipedia summary](../../../06-reference-library/articles/wikipedia-signs-of-ai-writing-cc-by-sa/wikipedia-signs-of-ai-writing.md), humanizer, Clark et al., Graham, Willison, Orwell, and Strunk. IDs remain stable when examples change.

## Lexical

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| L01 | Stock exploration | "Let's delve into the cache issue." | The cache keeps expired sessions. |
| L02 | Decorative metaphor | "Our stack is a rich tapestry of services." | The API calls six services before returning a result. |
| L03 | Unsupported tribute | "This launch is a testament to our dedication." | We shipped the migration on Friday. |
| L04 | Abstract setting | "The AI landscape is rapidly evolving." | Model prices fell again this quarter. |
| L05 | Vague assistance | "We help teams navigate deployment challenges." | We help teams roll back failed deployments. |
| L06 | Importance without action | "It is crucial to validate your inputs." | Reject requests without an account ID. |
| L07 | Inflated turning point | "The meeting marked a pivotal moment." | At that meeting, we canceled the rewrite. |
| L08 | Business verb | "Leverage our existing infrastructure." | Use the queue we already run. |
| L09 | Unmeasured ease | "The tool offers seamless integration." | The tool reads the existing config file. |
| L10 | Unspecified reliability | "We built a robust solution." | The worker retries twice, then alerts the on-call engineer. |
| L11 | Stock context | "In today's fast-paced world, teams need speed." | Our deploy takes 45 minutes. |
| L12 | Staged opening | "Let's dive in." | Start with the failed request. |
| L13 | Inflated benefit | "This feature is a game-changer." | This feature removes the manual CSV upload. |
| L14 | Sales verb | "Unlock the power of your data." | Find accounts with duplicate invoices. |
| L15 | Vague improvement | "Elevate your developer experience." | Cut the setup from six commands to one. |
| L16 | Empty attention cue | "It's worth noting that the endpoint is public." | The endpoint is public. |
| L17 | Stock closer | "At the end of the day, cost matters." | We cannot spend more than the approved budget. |
| L18 | Inflated synonym | "Utilize the aforementioned methodology." | Use that method. |
| L19 | Empty abstraction | "The solution addresses multifaceted operational complexities." | The solution handles failed uploads and duplicate requests. |
| L20 | Empty transition | "Furthermore, it is important to emphasize the benefits." | Cut the transition; state the next supported benefit. |

## Syntactic

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| S01 | Unsupported participial inference | "We added a retry, underscoring our commitment to reliability." | We added one retry for connection resets. |
| S02 | Avoiding a simple verb | "The dashboard serves as a central hub for metrics." | The dashboard shows the service metrics. |
| S03 | Nested relatives | "The patch the reviewer the manager hired approved failed." | The patch failed. It had been approved by a reviewer whom the manager hired. |
| S04 | Missing helpful relativizer | "The change the migration script applies deletes old rows." | The change that the migration script applies deletes old rows. |
| S05 | Novel noun-derived verb | "Let's spreadsheet the incident." | Put the incident timeline in a spreadsheet. |
| S06 | Human action assigned to an object | "The abstraction bullies the caller into retries." | The caller has to retry because the API returns no status. |
| S07 | Long dependency | "The service, after a series of changes introduced during the migration and reviewed last month, fails." | The service fails after last month's migration changes. |
| S08 | Noun stack | "Fix the model response quality regression triage workflow." | Fix how we investigate declines in model response quality. |
| S09 | Nominalization | "The implementation of validation enables prevention of corruption." | Validation stops malformed rows from reaching the database. |
| S10 | Hidden actor | "A decision was made to delay." | I asked to delay the launch. |
| S11 | Ambiguous pronoun | "This makes it better." | Batching cuts the number of network calls. |
| S12 | Rare compressed phrase | "The patch reduces reviewer-attention debt." | The patch leaves reviewers less unrelated code to inspect. |

## Structural

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| ST01 | Preamble | "Before we begin, it is important to understand the broader context." | The rollback failed because the schema change was irreversible. |
| ST02 | Micro-headings | "Background / Context / Overview / Introduction: We need approval." | Please approve the migration window. |
| ST03 | Repeated summary | "Caching saves repeat work. In summary, caching avoids repeat work." | Caching saves repeat work. |
| ST04 | Generic outlook | "Despite these challenges, the future remains bright." | The remaining blocker is the missing export endpoint. |
| ST05 | Empty balanced template | "Pros: cheap. Cons: slow. Conclusion: choose wisely." | Use the cheaper tier for nightly jobs; it misses the interactive latency target. |
| ST06 | Mechanical paragraph shape | "Every paragraph contains the same setup, explanation, and recap." | Give the main evidence a full paragraph. Give the correction one sentence. |
| ST07 | Unnecessary outline | "Here are twelve dimensions to consider before answering yes." | Yes, if the logs stay inside our account. |
| ST08 | Circular ending | "Ultimately, this highlights why the issue matters." | Remove the public bucket before the next release. |

## Rhetorical

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| R01 | Empty dramatic contrast | "It's not about tools, it's about people." | The rollout failed because nobody owned support. |
| R02 | Additive parallelism | "The tool not only saves time but also improves productivity." | The tool removes the daily status spreadsheet. |
| R03 | Forced cadence | "We need clarity, confidence, and collaboration." | We need an owner for the release decision. |
| R04 | Staged question | "The secret? Better prompts." | The second prompt includes the missing schema. |
| R05 | Unnamed authority | "Experts agree that this approach is best." | The cited benchmark favors this approach on the tested workload. |
| R06 | Meaningless range | "From innovation to transformation, we cover it all." | We handle deployment and rollback. |
| R07 | Slogan | "Consistency is the currency of trust." | Users stop trusting the status page when it reports success during outages. |
| R08 | Imaginary objection | "Some might say tests don't matter. But they do." | The proposed test catches the bug from Tuesday. |
| R09 | Inflated consequence | "This marks a new era in engineering." | We can now deploy without a maintenance window. |
| R10 | Repeated closer | "That changes everything. Read that again." | Cut the closer or state the supported consequence. |

## Formatting

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| F01 | Decorative bold | "**Speed:** It is faster. **Cost:** It is cheaper." | Use plain bullets containing the actual measurements. |
| F02 | Title case | "Why This Matters For Your Team" | Why this matters for your team |
| F03 | Decorative symbols | "Rocket emoji: Launch. Fire emoji: Results." | Launch: 14 November. Results: pending. |
| F04 | Excessive separators | "A short reply split by three horizontal rules." | One paragraph and the requested link. |
| F05 | Excessive headings | "A heading before every sentence of a five-sentence email." | Five sentences grouped by purpose. |
| F06 | Universal dash joiner | "We shipped [dash] it failed [dash] we reverted." | We shipped, hit an error, and reverted. |
| F07 | Needless table | "A two-column table containing one yes/no answer." | Yes. The setting is enabled by default. |
| F08 | Assistant wrapper | "Certainly! Here's your revised response:" | Return only the email text. |

## Tone

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| T01 | Automatic agreement | "You're absolutely right! That's a fantastic insight." | The proposal fixes the timeout, but leaves the retry bug. |
| T02 | Unsupported enthusiasm | "I'm thrilled to announce this groundbreaking improvement." | The export endpoint is available today. |
| T03 | Stacked hedges | "It may perhaps potentially be somewhat risky." | It may expose customer IDs. We have not checked the logs. |
| T04 | False neutrality | "There are various perspectives on whether to fix the bug." | Fix the bug before adding another feature. |
| T05 | False intimacy | "I know exactly how you feel." | That sounds frustrating. |
| T06 | Invented experience | "I spent years learning this the hard way." | Remove the claim unless Aman supplies that experience. |
| T07 | Performed humility | "I'm just a humble engineer sharing a few thoughts." | State the observation without the disclaimer. |
| T08 | Uniform fragments | "Bad tests. Bad prompts. Bad outcomes." | The test suite never checks malformed inputs. |

## Email

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| E01 | Stock greeting | "I hope this email finds you well." | Hi Priya, |
| E02 | Announcing the email | "I am writing to reach out regarding the migration." | Can we move the migration to Thursday? |
| E03 | Vague ask | "Please let me know your thoughts at your earliest convenience." | Can you approve the window by Wednesday at 3 pm? |
| E04 | Stacked gratitude | "Thank you so much for your invaluable time and consideration." | Thanks for reviewing this. |
| E05 | Availability ceremony | "Please do not hesitate to reach out if you have any questions." | I can walk through the failure trace tomorrow. |
| E06 | Formal follow-up | "I wanted to kindly follow up on my previous correspondence." | Following up on the access request below. |
| E07 | Repeating shared context | "As you know, our team works on the payments service." | The payment export still fails on empty accounts. |
| E08 | Unauthorized promise | "We will have this resolved by tomorrow." | I will send a diagnosis tomorrow. Use only if authorized. |

## LinkedIn

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| LI01 | Manufactured confession | "I wasn't going to share this. But here goes." | Start with the actual observation. |
| LI02 | Engagement bait | "Agree? Thoughts? Repost if this resonates." | Omit the line unless there is a specific question that needs an answer. |
| LI03 | Empty lesson list | "Seven lessons that changed my career forever." | What changed after we made deployment reviews optional. |
| LI04 | One-line staircase | "I failed. Then learned. Then grew." | I missed the rollback check and delayed the release. |
| LI05 | Heroic arc | "Nobody believed in the vision. Today, we proved them wrong." | Name the milestone and show its evidence. |
| LI06 | Unsupported social proof | "Thousands of leaders are adopting this approach." | Name documented users or remove the number. |
| LI07 | Unrelated tags | "A closing block of unrelated trending hashtags." | Use a relevant tag only if Aman normally does. |
| LI08 | Generic inspiration | "Your journey starts with a single step." | Name a useful first action or omit the line. |

## Essay and article

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| A01 | Sweeping opener | "Since the dawn of time, humans have sought innovation." | Our benchmark rewards answers that production users cannot use. |
| A02 | Empty scope promise | "This article will explore the multifaceted implications of AI." | State the claim and the reader affected by it. |
| A03 | Invented anecdote | "Last Tuesday, a founder called me in tears." | Use a verified scene or begin with evidence. |
| A04 | Evidence-free certainty | "This proves agents will replace engineers." | This experiment shows the agent completed the tested tasks. |
| A05 | Straw man | "Critics simply fear progress." | A serious objection is the cost of verifying each generated change. |
| A06 | Repeated thesis | "This again shows that evaluation matters." | Move to the next piece of evidence. |
| A07 | Vague association | "The researcher was connected with work on safety." | The researcher coauthored the evaluation paper. |
| A08 | Bibliography theater | "Peer-reviewed research definitively confirms the claim." | Name the paper, result, and limitation. |
| A09 | Universal uplift | "Together, we can shape a brighter future." | If the test never runs against production inputs, do not call it a deployment gate. |
| A10 | Preprint overclaim | "Science now proves dense AI prose is incomprehensible." | A new preprint measures features associated with processing difficulty. |

## Code comment, PR, and commit

| ID | Cue | Before, quoted exercise | After, with authorized facts |
|---|---|---|---|
| C01 | Narrating code | "Increment the counter by one." | Omit the comment when the statement is already clear. |
| C02 | Invented rationale | "Use this helper for better maintainability." | Explain the actual invariant or omit the rationale. |
| C03 | Adjectival PR summary | "Implements a robust and seamless error-handling solution." | Return 400 when `account_id` is missing. |
| C04 | Unverified tests | "Thoroughly tested all edge cases." | List tests actually run; say "not run" when appropriate. |
| C05 | Scope inflation | "Refactors the entire authentication architecture." | Extract the token parser into `parseToken`. |
| C06 | Checklist theater | "All best practices and security standards followed." | Name checks performed and remaining risks. |
| C07 | Repeating a diff | "Renamed x to accountId for improved clarity." | State why the identifier was ambiguous if relevant to review. |
| C08 | Unverified concurrency | "Fetches both records in parallel." | Say "fetches both records" unless concurrency is verified. |
| C09 | Vague commit subject | "Improve things." | Reject uploads without an account ID. |
| C10 | Unfounded commit result | "Fix all export failures." | Handle empty account exports. |
