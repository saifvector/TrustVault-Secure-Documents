## What changed

<!-- One concern per PR. Describe what and why. -->

## How it was tested

<!-- Commands run and results. Do not claim tests you did not run. -->

- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Security invariants

<!-- Check CONTRIBUTING.md → "Security invariants". If any answer is yes,
explain how the invariant is preserved. -->

- [ ] This PR does not add a write path outside server functions
- [ ] This PR does not add update/delete paths to the audit log
- [ ] This PR does not expose file content without a fresh permission check
- [ ] This PR does not let administrators bypass content authorization
- [ ] This PR adds no secrets or credentials to the repository

## Documentation

- [ ] Docs updated (README / docs/) if behavior changed
- [ ] Tests added or updated for any changed rule (permissions, roles, limits)
