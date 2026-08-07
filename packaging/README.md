# Packaging

This folder keeps local test packaging isolated from the app code.

- `electron-builder.yml`: packaging config
- output artifacts go to `dist/`

Primary script for this Linux machine:

- `npm run package:local`

Potential Windows script when run from a Windows build environment:

- `npm run package:win`
