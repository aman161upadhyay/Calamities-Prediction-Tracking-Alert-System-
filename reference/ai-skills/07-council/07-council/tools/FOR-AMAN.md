# Aman, when and how to run the lint

Run it before every commit that adds or edits Markdown, and before starting a council round:

```text
pip install pyyaml            # once; without it the lint reports a major and skips the eval-schema check
python3 07-council/tools/lint.py .
python3 07-council/tools/test_lint_secrets.py       # after any change to the secret patterns
python3 07-council/tools/test_lint_eval_schema.py   # after any change to the schema check
```

Exit code 0 means no blockers and no majors; 1 means at least one of either. Minors are printed and do not fail the run. Reviewers in a council round assume the lint is clean, so they spend their attention on judgement calls instead of missing files.

Framing for an agent that runs it for you: "Run the three commands above from the repository root and paste the output. Do not edit any file. If there are findings, list each with the file and line and propose the fix, but wait for my approval before changing anything."

Access to grant: read access to the repository and permission to run Python in it. Access to refuse: write access (the lint changes nothing, and an agent that fixes findings while linting hides what the lint found), network access (none is needed), and any token.

To add a banned pattern, edit the `BANNED` list in `lint.py` and add the same phrase to `PRINCIPLES.md` section 4 in the same commit, so the rule and its enforcement never drift. To exempt a file that legitimately contains the patterns (a new catalogue, a regex list), add a distinguishing word to its path such as `catalogue` or `banned`; do not add path-specific exceptions to the script. To add a secret pattern, add it to `SECRETS`, add a tilde-obfuscated fixture to `test_lint_secrets.py`, and check the test still reports every fixture as expected.

Check before trusting a lint run: the last line shows `blockers=0 majors=0`, and the eval-schema check actually ran (no "PyYAML is not installed" line in the output).
