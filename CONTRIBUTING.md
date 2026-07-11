# Contributing to ViteLab

Thanks for your interest in improving ViteLab. This document covers how to set up the repo, the conventions we follow, and how to get a change merged.

## Prerequisites

- Node.js 20+
- npm 10+ (the repo uses npm workspaces)

## Setup

```bash
git clone https://github.com/MasaKoha/ViteLab.git
cd ViteLab
npm install
```

## Repository layout

This is an npm-workspace monorepo built with `tsc -b` project references.

```
packages/
  core/        # @vitelab/core       — dependency-free helpers
  storage/     # @vitelab/storage    — typed IndexedDB layer
  dj-domain/   # @vitelab/dj-domain  — DJ tracklist domain (depends on core)
```

Keep the dependency direction acyclic: `dj-domain` → `core`, and `storage` standalone. Do not introduce a dependency from `core` onto any other workspace package.

## Development workflow

Run these before opening a pull request — all four must be green (this is what CI enforces):

```bash
npm run build       # tsc -b
npm test            # vitest run
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint .
npm run format      # prettier -w .   (or format:check to verify only)
```

Every new function or bug fix should come with Vitest tests. Test files live next to the source as `*.test.ts`.

## Coding conventions

- **TypeScript strict mode**, ESM only. Match the strictness already in `tsconfig.base.json` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc.).
- **No runtime dependencies in `@vitelab/core`.** Keep it pure; push DOM/canvas/IO concerns to the caller.
- **Public API gets doc comments.** Add a `/// `-style summary (`/** … */`) to every exported function, type, and class describing intent — the _why_, not the _what_.
- **Name things fully.** No abbreviations (`btn`, `cfg`, `mgr`, …). Always brace `if`/`for`/`while` bodies.
- **Prettier** formatting (single quotes, semicolons, 100-char width) and the ESLint flat config are the source of truth. Don't hand-format around them.
- Prefer `IReadOnly*` return types and avoid unnecessary allocations in hot paths.

## Commit messages

Use a single-line message in the form `<type>: <description>`:

| type       | use           |
| ---------- | ------------- |
| `feat`     | new feature   |
| `fix`      | bug fix       |
| `refactor` | refactoring   |
| `test`     | tests         |
| `docs`     | documentation |
| `chore`    | build/config  |

## Pull requests

1. Branch from the default branch (`feature/…`, `fix/…`, or `refactor/…`).
2. Make your change with tests and updated docs (including the relevant package `README.md` when you change a public API).
3. Ensure build/test/typecheck/lint/format all pass locally.
4. Open a PR describing the change and its motivation.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
