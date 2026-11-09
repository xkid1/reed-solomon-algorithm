# Contributing

Bug reports, focused fixes, tests, and documentation improvements are welcome. For larger behavior or API changes, open an issue first so the proposed contract can be discussed before implementation.

## Development Setup

- Node.js `>=26.13.0`
- Yarn `4.18.0`, managed with Corepack

From the repository root, install dependencies and run the test suite:

```sh
corepack enable
yarn install --immutable
yarn test
```

Run the full project checks before submitting:

```sh
yarn check
```

When changing package exports or packaging behavior, also run:

```sh
bash scripts/smoke-consumer.sh
```

## Change Guidelines

- Keep changes focused and follow the existing TypeScript and formatting conventions.
- Add or update tests for behavior changes. Tests should be deterministic and should not rely on the network or wall-clock time.
- Preserve the library's zero-runtime-dependency design unless maintainers agree otherwise.
- For public API changes, update the README API documentation and add an entry to `CHANGELOG.md`.
- Do not edit generated coverage reports or package build output as a substitute for changing their source.

## Pull Requests

Describe the behavior changed and why. Include the commands used to test the change, note any unverified checks, and call out public API or compatibility impacts. Keep each pull request narrow enough to review independently.
