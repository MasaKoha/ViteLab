# ViteLab

[日本語版はこちら](README.ja.md)

Shared TypeScript utilities for Vite-based web apps — dependency-free core helpers, a typed IndexedDB storage layer, and DJ tracklist domain logic. Extracted from several personal projects (SyncImageDeck, ViewerStudioForNP2, dj-tracklist) to eliminate copy-pasted code and keep behavior consistent across apps.

The monorepo is a plain npm workspace built with `tsc -b` project references and tested with Vitest. Every package ships ESM only with type declarations.

## Packages

| Package                                    | Description                                                                                                                           | Docs                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [`@vitelab/core`](packages/core)           | Dependency-free helpers: clock formatting, base64 / encoding detection, text normalization, math, color (RGB/HSL, accent extraction). | [README](packages/core/README.md)      |
| [`@vitelab/storage`](packages/storage)     | Low-level IndexedDB Promise wrapper plus `defineStore`, a typed key-value store factory.                                              | [README](packages/storage/README.md)   |
| [`@vitelab/dj-domain`](packages/dj-domain) | DJ tracklist domain: Camelot/musical key notation, a shared `Track` model, and rekordbox TSV / m3u8 parsers.                          | [README](packages/dj-domain/README.md) |

Dependency direction: `dj-domain` → `core`. `storage` is standalone.

## Requirements

- Node.js 20+
- npm 10+ (workspaces)

## Installation

The packages are not yet published to a registry. Consume them from source within this workspace, or install directly from GitHub:

```bash
# Inside this repo
npm install

# From another project (Git dependency)
npm install github:MasaKoha/ViteLab#main --workspace-pattern packages/core
```

Once installed in a workspace, import by package name:

```ts
import { formatClock, hexToRgb } from '@vitelab/core';
import { defineStore } from '@vitelab/storage';
import { parseInput, resolveKey } from '@vitelab/dj-domain';
```

## Usage overview

```ts
import { decodeArrayBuffer } from '@vitelab/core';
import { parseInput, resolveKey } from '@vitelab/dj-domain';

// 1. Decode a rekordbox TSV (UTF-16LE + BOM) or m3u8 (UTF-8) file with auto encoding detection.
const text = decodeArrayBuffer(await file.arrayBuffer());

// 2. Parse into a normalized Track list; the format is detected automatically.
const result = parseInput(text);
if (result) {
  for (const track of result.tracks) {
    // Track.key is always stored in Camelot form; render it however you like.
    console.log(track.artist, track.title, resolveKey(track.key, 'musical'));
  }
}
```

```ts
import { defineStore } from '@vitelab/storage';

interface Deck {
  id: string;
  name: string;
}

const decks = defineStore<Deck>({
  database: {
    name: 'my-app',
    version: 1,
    upgrade: (db) => db.createObjectStore('decks', { keyPath: 'id' }),
  },
  storeName: 'decks',
  keyPath: 'id',
  guard: (v): v is Deck =>
    typeof v === 'object' && v !== null && typeof (v as Deck).id === 'string',
});

await decks.save({ id: 'a', name: 'Warm-up' });
const all = await decks.loadAll();
```

## Development

```bash
npm install          # install workspace dependencies
npm run build        # tsc -b (all packages)
npm test             # vitest run
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run format       # prettier -w .
```

CI (GitHub Actions) runs `typecheck`, `lint`, and `test` on every push and pull request.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 MasaKoha
