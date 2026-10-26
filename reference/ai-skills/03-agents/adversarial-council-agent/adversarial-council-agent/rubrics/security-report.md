# Security report rubric

A security finding needs an authorized attack path and a violated boundary.

Pass only when the report states scope, environment and attacker capabilities. Each consequential finding needs a precise location, input-to-impact path, safe reproduction, observed versus expected outcome and independent retest direction.

Keep severity separate from confidence. Explain likelihood and impact. A scanner alert is a candidate finding until applicability is checked. Static analysis may support a finding, but cannot be relabeled as executed exploitation.

Require application-security coverage and agent-execution coverage where both exist. Test anonymous and cross-tenant controls with nonprivileged identities. A service-role check does not establish tenant isolation.

Hard failures include real secret exposure, out-of-scope attack traffic, invented reproduction and claiming “secure” from zero findings. Distinguish confirmed defects, hypotheses and optional hardening. Record benign controls to measure false refusal. A fix must replay the original probe and preserve authorized behavior.
