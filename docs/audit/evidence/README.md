# Audit Evidence Index

Keep small, reviewable text evidence here when it belongs in version control. Large
screenshots, videos, traces, temporary databases, package artifacts, and hardware
captures stay outside git and are referenced from reports with:

- Absolute or durable storage location.
- SHA-256 or equivalent content hash.
- Source commit/patch identity.
- Environment and reproduction steps.
- Retention or cleanup date.

Never place production databases, personal practice data, credentials, cookies,
private URLs, or proprietary MIDI/audio files in this directory.

No raw audit artifacts are stored in this directory yet. Phase reports hold the
reproducible command summaries and findings links; large temporary fixtures were
created under /tmp and removed after each isolated probe.
