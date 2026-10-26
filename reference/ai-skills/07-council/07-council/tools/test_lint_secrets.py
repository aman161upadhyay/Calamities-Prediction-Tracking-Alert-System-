#!/usr/bin/env python3
"""Regression test for lint.py's secret scan. Builds synthetic fixtures in a temp copy of a tiny tree and
checks that each pattern family is detected, including the two bypasses found in council round 2
(dummy token followed by a real-shaped token on one line; credential URL on an example.com host).
Run: python3 07-council/tools/test_lint_secrets.py
No fixture is ever written inside the repository."""
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LINT = os.path.join(HERE, "lint.py")

# Values are synthetic and non-repeating. Lines are stored with a tilde after every third character so that
# neither this file nor a base64 view of it contains a token-shaped string (GitHub push protection decodes base64).
FIXTURES = [  # (file name, line with a tilde after every third character, expected detection)
    (".env", "AWS~_KE~Y=A~KIA~QM3~VL8~TZP~2XC~9KW~4", True),
    (".env.local", "OPE~NAI~_AP~I_K~EY=~sk-~pro~j-Q~m3v~L8t~Zp2~Xc9~Kw4~Rn7~Hy1~Jd", True),
    ("notes.txt", "tok~en ~sk-~ant~-Qm~3vL~8tZ~p2X~c9K~w4R~n7H~y1J~d", True),
    ("conf.yaml", "gh:~ gh~p_Q~m3v~L8t~Zp2~Xc9~Kw4~Rn7~Hy1~Jd6~Fb0~Sg5~Ue8~Va", True),
    ("conf2.yaml", "gh:~ gi~thu~b_p~at_~Qm3~vL8~tZp~2Xc~9Kw~4Rn~7Hy~1Jd~6Fb~0Sg~5Ue~8", True),
    ("hf.txt", "hf_~Qm3~vL8~tZp~2Xc~9Kw~4Rn~7Hy~1Jd~6Fb~0Sg~5Ue~8", True),
    ("g.txt", "AIz~aQm~3vL~8tZ~p2X~c9K~w4R~n7H~y1J~d6F~b0S~g5U~e8V", True),
    ("v.txt", "vca~_Qm~3vL~8tZ~p2X~c9K~w4R~n7H~y1J~d", True),
    ("s.txt", "xox~b-Q~m3v~L8t~Zp2~Xc9~Kw4~Rn7~H", True),
    ("gl.txt", "glp~at-~Qm3~vL8~tZp~2Xc~9Kw~4Rn~7Hy~1Jd", True),
    ("npm.txt", "npm~_Qm~3vL~8tZ~p2X~c9K~w4R~n7H~y1J~d6F~b0S~g5U~e8V~a", True),
    ("key.pem", "---~--B~EGI~N R~SA ~PRI~VAT~E K~EY-~---~-", True),
    ("url.txt", "pos~tgr~es:~//a~dmi~n:Q~m3v~L8t~Zp2~Xc9~Kw4~Rn7~H@d~b.i~nte~rna~l:5~432~/ap~p", True),
    ("assign.txt", "pas~swo~rd ~= \"~Qm3~vL8~tZp~2Xc~9Kw~4Rn~7H\"", True),
    ("same-line.env", "HF_~TOK~EN=~hf_~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~x r~eal~=hf~_Qm~3vL~8tZ~p2X~c9K~w4R~n7H~y1J~d6F~b0S~g5U~e8", True),
    ("allow-bypass.env", "htt~ps:~//u~ser~:Qm~3vL~8tZ~p2X~c9K~w4R~n7H~@ap~i.e~xam~ple~.co~m/v~1", True),
    ("ok1.md", "OPE~NAI~_AP~I_K~EY=~<PL~ACE~HOL~DER~>", False),
    ("ok2.md", "hf_~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~x", False),
    ("ghost-xxxx.txt", "ghp~_Qm~3vL~8tZ~p2X~c9K~w4x~xxx~Rn7~Hy1~Jd6~Fb0~Sg5~U", True),
    ("url-placeholder-host.txt", "htt~ps:~//s~vc:~Qm3~vL8~tZp~2Xc~9Kw~4Rn~7H@~pla~ceh~old~er.~exa~mpl~e.c~om/~v1", True),
    ("assign-example-word.txt", "api~_ke~y =~ \"Q~m3v~L8t~Zp2~Xce~xam~ple~9Kw~4Rn~7H\"", True),
    ("ok4.md", "HF_~TOK~EN=~${H~F_T~OKE~N}", False),
    ("ok5.md", "OPE~NAI~_AP~I_K~EY=~{{O~PEN~AI_~API~_KE~Y}}", False),
    ("ok6.md", "exp~ort~ GI~THU~B_T~OKE~N=g~hp_~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx~xxx", False),
    ("prefix-xxxx.txt", "api~_ke~y =~ xx~xxQ~m3v~L8t~Zp2~Xc9~Kw4~Rn7~Hy1~Jd", True),
    ("prefix-placeholder.txt", "tok~en:~ \"p~lac~eho~lde~rQm~3vL~8tZ~p2X~c9K~w4R~n7H~\"", True),
    ("prefix-example.txt", "SEC~RET~=ex~amp~leQ~m3v~L8t~Zp2~Xc9~Kw4~Rn7~H", True),
    ("ok7.md", "api~_ke~y =~ re~pla~ce-~wit~h-y~our~-ke~y-h~ere", False),
    ("ok8.md", "TOK~EN=~exa~mpl~e_s~ecr~et_~val~ue_~her~e", False),
    ("ok3.md", "pas~swo~rd ~= y~our~_pa~ssw~ord~_he~re_~val~ue", False),
]


def main():
    tmp = tempfile.mkdtemp(prefix="lint-secrets-")
    root = os.path.join(tmp, "tree")
    os.makedirs(os.path.join(root, "fixtures"))
    for name, obfuscated, _ in FIXTURES:
        with open(os.path.join(root, "fixtures", name), "w") as f:
            f.write(obfuscated.replace("~", "") + "\n")
    proc = subprocess.run([sys.executable, LINT, root], capture_output=True, text=True)
    if proc.returncode not in (0, 1):
        print(f"lint did not complete: exit {proc.returncode}\n{proc.stderr[-800:]}"); shutil.rmtree(tmp); sys.exit(2)
    out = proc.stdout
    # one diagnostic per line: "BLOCKER  <path>:<line>: possible secret: <name>"; the fixture path and the
    # secret message must be on the same line, so an unrelated diagnostic cannot satisfy a positive case
    secret_lines = [l for l in out.splitlines() if l.startswith("BLOCKER") and "possible secret" in l]
    failures = 0
    for name, _, expected in FIXTURES:
        hit = any(f"fixtures/{name}:" in l for l in secret_lines)
        if hit != expected:
            failures += 1
            print(f"FAIL {name}: expected detected={expected}, got {hit}")
    shutil.rmtree(tmp)
    print(f"{len(FIXTURES) - failures}/{len(FIXTURES)} fixtures behaved as expected")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
