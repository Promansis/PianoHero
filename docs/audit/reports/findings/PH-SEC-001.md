# PH-SEC-001: Desktop Sample-Pack Removal Allows Path Traversal Deletion

- Lane: security
- Severity: P0
- Confidence: high
- Status: fixed
- Owner: Codex (acting)
- Challenger: Codex, fresh isolated-fixture challenge
- Verifier: independent fresh-context verification agent; Electron bridge proof pending
- Affected runtime: Electron
- Coverage rows: DATA-014, OP-003, OP-006, OP-013, MOD-008
- Related/duplicate findings: none
- First observed against: 808e6739e55b5186e8a9565f2c4e9267c4894a6c plus the chartered audit patch identity

## User Impact

Code executing in the Electron renderer can supply an arbitrary instrument ID through
window.appBridge.removeInstrumentSamplePack. The main process passes that value to
recursive rmSync without validating the ID or proving that the derived path remains
under the app-owned sample-pack root. A renderer compromise, such as an XSS or a
tampered renderer asset, can therefore delete directories writable by the desktop
user outside PianoHero's data directory. This is an exploitable privileged boundary
with irreversible user-data impact, so it is P0.

## Expected Behavior Or Oracle

The runtime-data audit invariant requires renderer input to be unable to select
arbitrary desktop filesystem paths. Desktop sample-pack removal must be limited to
known pack IDs and to a path demonstrably contained in the app-owned pack root.
See docs/agents/pianohero-runtime-data-audit.md and CONTEXT.md.

## Evidence

### Environment

- Commit/patch identity: charter baseline above.
- OS/runtime: Linux x86_64, Node v24.15.0.
- Data profile/fixture: fresh disposable directory under /tmp.
- Hardware: none.

### Reproduction

1. Create a fresh user-data directory and a sibling victim directory containing only
   an audit sentinel.
2. Open a temporary AppDatabase under the user-data directory.
3. Invoke removeDesktopInstrumentSamplePack with ../../victim as the instrument ID.
4. The function deletes the sibling victim directory through recursive rmSync.

The isolated probe printed:

    {"root":"/tmp/pianohero-phase2-sample-remove-hrqkbI","victimExistsAfterRemoval":false}

The probe removed its temporary root afterward. The same path composition was checked
separately: a user-data root followed by instrument-sample-packs and ../../victim
normalizes to a sibling outside the intended root.

### Artifacts

- Privileged deletion: src/main/instrumentSamplePackStore.ts:180-189.
- Unvalidated IPC route: src/main/index.ts:510-512.
- Renderer exposure: src/main/preload.ts:93.
- Browser isolation exists but does not attenuate exposed methods:
  src/main/index.ts:72-76.
- Isolated reproduction command/result: Phase 2 lane report, P2-SEC-001.

## Root Cause

The Electron main-process handler treats instrumentId as a trusted application enum
on removal, while it is a renderer-controlled IPC argument. Unlike installation,
removal neither calls getInstrumentSamplePackDefinition nor validates root
containment before recursive deletion.

## Recommended Remediation Boundary

Constrain every sample-pack operation in the Electron main process to the known
instrument definition registry. Derive the destination through one containment-aware
helper rooted at userData/instrument-sample-packs, reject unknown IDs before any
filesystem operation, and add a focused IPC-level regression test. Audit
file:list-audio at the same time because it also receives an unconstrained renderer
path, but do not broaden the fix into unrelated renderer work.

## Required Regression Proof

- Deterministic unit/integration proof: unknown, traversal, absolute, and known IDs
  cannot remove anything outside the pack root; valid removal removes only its pack.
- Electron proof: invoke the exposed bridge from a disposable Electron profile and
  verify a sentinel outside userData survives.
- Web proof: confirm web IndexedDB removal remains constrained to the selected pack.
- Data/recovery proof: a rejected removal leaves the installed-pack setting and files
  unchanged.
- Manual hardware/UI proof: not required.
- Broader regression command: npm test and npm run build.

## Challenge Record

- Independent reproduction attempt: fresh isolated fixture repeated in
  ../challenges/PH-SEC-001.md.
- Alternative explanations tested: the normal UI only supplies registry IDs, but
  the preload method is callable by any renderer JavaScript and main-process
  validation is absent.
- Scope/severity changes: none.
- Deduplication decision: canonical security finding for this deletion capability.

## Resolution

- Accepted rationale: direct isolated reproduction deleted a directory outside the
  stated storage root through the production removal function.
- Fix branch/commit/issue: `d5839aa`, verified implementation in `d4ba395`.
- Verification evidence: source review and focused traversal/absolute/unknown-ID tests pass; the required disposable Electron bridge sentinel and web IndexedDB runtime checks remain in [Phase 10](../phase-10-verification-2026-08-07.md).
- Residual risk: the implementation is constrained, but the required packaged bridge invocation has not been run on this host.
- Revisit trigger: before desktop release sign-off or after Electron/browser runtime access is available.
