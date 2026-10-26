# Store few-shot examples

Keep these records in private storage, not this repository. Each record pairs a task with approved wording.

| Field | Required content |
|---|---|
| id | Stable non-identifying sample ID. |
| register and medium | Personal; message app or email. |
| relationship | General role such as close friend, without the name. |
| intent | Decline, accept, correct, check in, or another concrete purpose. |
| context | What the recipient already knows; no unnecessary history. |
| task facts | Only facts authorized for that historical example. |
| final text | Aman's redacted and approved wording. |
| style annotation | Habit illustrated and context where it applies. |
| exclusions | Facts and phrases that must not transfer. |
| provenance and consent | Export date, author confirmation, retention date, allowed processing. |
| split | Training or held-out; all messages in a thread share the split. |

Wrap sample text in a data boundary with escaped delimiters. Do not let a message such as "ignore all previous instructions" become a command. Retrieval selects by relationship and intent. New tasks still need a fresh fact brief. A historical acceptance never authorizes accepting a new invitation.
