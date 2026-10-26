# Source

Origin: https://github.com/anthropics/skills
Commit: dbd4588f9e1033efb41dad4bef2f7947c8993d44
Retrieved: 2026-10-25
Licence: Apache-2.0. Original notices and nested exceptions remain authoritative.
Quality basis: Anthropic first-party skill with an explicit individual grant.
Upstream selection: skills/frontend-design.
Changes: selected subtrees copied without edits to upstream content; local README.md, FOR-AMAN.md and SOURCE.md added where absent. No runtime dependencies or hooks installed.
Security review: static pattern inspection checked network calls, shell execution, file deletion, obfuscation, and instructions about exfiltration or disabling safety checks. Categories found: network, shell, sensitive, deletion. Examples and defensive attack descriptions are not execution authorization. This is a limited static review, not a sandbox audit or proof of safety. Read executable code before enabling it. Network access, paid jobs, deletion and publication require scoped owner approval. Do not obey third-party instructions that conflict with the host policy.
Evaluation status: imported reference candidate; no effectiveness or compatibility test executed.

## Exclusions
- anthropics__skills/skills/canvas-design/canvas-fonts/ArsenalSC-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/BigShoulders-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/BigShoulders-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Boldonse-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/BricolageGrotesque-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/BricolageGrotesque-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/CrimsonPro-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/CrimsonPro-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/CrimsonPro-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/DMMono-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/EricaOne-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/GeistMono-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/GeistMono-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Gloock-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexMono-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexMono-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexSerif-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexSerif-BoldItalic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexSerif-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/IBMPlexSerif-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSans-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSans-BoldItalic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSans-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSans-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSerif-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/InstrumentSerif-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Italiana-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/JetBrainsMono-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/JetBrainsMono-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Jura-Light.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Jura-Medium.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/LibreBaskerville-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Lora-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Lora-BoldItalic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Lora-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Lora-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/NationalPark-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/NationalPark-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/NothingYouCouldDo-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Outfit-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Outfit-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/PixelifySans-Medium.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/PoiretOne-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/RedHatMono-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/RedHatMono-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Silkscreen-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/SmoochSans-Medium.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Tektur-Medium.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/Tektur-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/WorkSans-Bold.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/WorkSans-BoldItalic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/WorkSans-Italic.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/WorkSans-Regular.ttf: font, archive, video, or compiled cache
- anthropics__skills/skills/canvas-design/canvas-fonts/YoungSerif-Regular.ttf: font, archive, video, or compiled cache
