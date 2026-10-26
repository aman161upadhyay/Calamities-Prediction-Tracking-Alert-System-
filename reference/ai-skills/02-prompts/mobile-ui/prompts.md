# Three mobile briefs

Purpose: a native task with platform behavior and truthful state. Supply platform/version, framework, tokens, approved data and permission rules. These fictional examples adapt research 05 and remain untested.

## iOS appointment selection

```text
Design native iOS appointment selection for a fictional physiotherapy practice.
An existing patient chooses one available slot. Use supplied clinicians,
locations and actual availability. Never simulate a confirmed booking.
Use iOS navigation/date patterns, Dynamic Type and roughly 44pt default targets.
Order: clinician/location summary, available date, slots, selection summary,
Continue. Respect safe areas and keyboard.
Include no slots, slot taken during selection, network failure, loading and
confirmed server success. VoiceOver announces selection with date/time/timezone.
Keep health data private in screenshots/analytics. Use approved blue/neutral
tokens, not a web sidebar. Deliver large-text and keyboard-visible layouts.
```

## Android field inspection

```text
Design a Material 3 inspection checklist for outdoor technicians with intermittent
connectivity. Use supplied items and asset metadata.
Prioritize current item, completion status and Save inspection.
Use platform back, scalable text and 48dp targets; support larger targets if asked.
Distinguish saved-on-device from synced. Resume drafts and add approved photos
after contextual permission. Review issues before submission.
Include denied camera, offline save, sync conflict and server rejection.
Do not rely on green/red alone. Test contrast outdoors rather than automatically
choosing OLED black. Avoid decorative motion.
Verify TalkBack labels, draft recovery and truthful confirmation.
```

## Paired iOS/Android expense capture

```text
Create platform-specific screens for a fictional expense app.
Use the same task and information architecture with native navigation/components.
Review a supplied receipt image; correct merchant, date, currency and amount;
save a draft. Make OCR uncertainty visible.
iOS: Dynamic Type, VoiceOver and native back/sheet behavior.
Android: Material 3 fields, TalkBack and platform back.
Use default areas around 44pt on iOS and at least 48dp on Android.
Include cropped receipt, missing currency, validation failure, upload failure
and duplicate-draft warning. Preserve edits across backgrounding.
Ask before financial export or paid OCR.
Deliver large-text, light/dark and keyboard-visible layouts for both platforms.
Report tested behavior separately from unverified assumptions.
```

Acceptance: task completion, state truth, platform adaptation and adverse-state recovery. Failure modes: identical web-shaped controls, hidden keyboard actions and local drafts presented as synced.
