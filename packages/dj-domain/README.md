# @vitelab/dj-domain

[日本語版はこちら](README.ja.md)

Core domain logic for DJ tracklists: Camelot ⇄ musical key notation, a shared normalized `Track` model, and parsers for rekordbox TSV and m3u8 exports. Text normalization and encoding detection are delegated to [`@vitelab/core`](../core) so there is no duplicated logic.

OpenKey notation is intentionally unsupported (neither source app used it), though `KeyNotation` is typed so it can be extended later.

```ts
import {
  type KeyNotation,
  isCamelot,
  normalizeToCamelot,
  camelotToMusical,
  resolveKey,
  type Track,
  type SourceFormat,
  type ParseResult,
  type ITrackParser,
  RekordboxTsvParser,
  M3u8Parser,
  parseInput,
} from '@vitelab/dj-domain';
```

## Key notation

`Track.key` is always stored in normalized Camelot form (e.g. `"4A"`). Musical notation uses an `m` suffix for minor and `b` for flats (e.g. `"Fm"`, `"Ab"`).

### `type KeyNotation = 'camelot' | 'musical'`

Output notation selector for `resolveKey`.

### `isCamelot(value: string): boolean`

Returns whether the (trimmed) value is Camelot notation, e.g. `"4A"`, `"12B"`. Case-insensitive.

### `normalizeToCamelot(value: string): string`

Converts any key notation to normalized Camelot. Camelot input is upper-cased; musical input is resolved via the conversion table (absorbing variants like `"F min"`, `"F#m"`, `"Gbm"`, and `♯`/`♭` glyphs). If it cannot be resolved, the trimmed input is returned unchanged.

### `camelotToMusical(camelot: string): string`

Converts Camelot to musical notation. Unknown input is returned unchanged.

### `resolveKey(key: string | undefined, notation: KeyNotation): string`

Resolves a stored (Camelot) key to the requested notation for display. Returns `''` for empty/`undefined`. With `'camelot'` the key is returned as-is; with `'musical'` it is converted.

```ts
isCamelot('4A'); // true
normalizeToCamelot('F min'); // "4A"
normalizeToCamelot('F#m'); // "11A"
camelotToMusical('4A'); // "Fm"
resolveKey('4A', 'musical'); // "Fm"
resolveKey(undefined, 'camelot'); // ""
```

## Track model

### `interface Track`

Normalized track. Every field is optional except `tags` ("only what exists is present", since sources carry different information). Raw source columns are preserved in `_raw` as a safety net for unmapped columns.

| Field         | Type                      | Notes                                                                  |
| ------------- | ------------------------- | ---------------------------------------------------------------------- |
| `no`          | `string?`                 | Track number / row index.                                              |
| `artist`      | `string?`                 |                                                                        |
| `title`       | `string?`                 |                                                                        |
| `album`       | `string?`                 |                                                                        |
| `bpm`         | `string?`                 |                                                                        |
| `key`         | `string?`                 | Normalized Camelot notation (e.g. `"4A"`).                             |
| `tags`        | `string[]`                | From "My Tag"; empty array allowed.                                    |
| `durationSec` | `number?`                 | From m3u8; source for timestamp generation.                            |
| `time`        | `string?`                 | Display `"mm:ss"` (TSV: original string; m3u8: computed from seconds). |
| `rating`      | `string?`                 |                                                                        |
| `playCount`   | `string?`                 |                                                                        |
| `genre`       | `string?`                 |                                                                        |
| `label`       | `string?`                 |                                                                        |
| `year`        | `string?`                 |                                                                        |
| `remixer`     | `string?`                 |                                                                        |
| `location`    | `string?`                 | Absolute local/cloud path.                                             |
| `fileName`    | `string?`                 |                                                                        |
| `_raw`        | `Record<string, string>?` | Original columns preserved.                                            |

### `type SourceFormat = 'tsv' | 'm3u8'`

The input format `parseInput` detects.

### `interface ParseResult`

```ts
interface ParseResult {
  format: SourceFormat;
  tracks: Track[];
}
```

### `interface ITrackParser`

Parser contract. Detection is confined to each parser's `canParse`; the dispatcher queries parsers in registration order. Adding a new format means adding one parser implementation.

```ts
interface ITrackParser {
  /** Format id used for UI badges. */
  readonly format: SourceFormat;
  /** Whether this parser can handle the input. Must be side-effect free. */
  canParse(source: string): boolean;
  /** Converts input into a normalized Track array. */
  parse(source: string): Track[];
}
```

## Parsers

### `parseInput(source: string): ParseResult | null`

Format-detecting dispatcher. Queries m3u8 first (TSV detection is a loose tab check), delegating to the first matching parser. Returns `null` for empty input or when no parser matches.

The paste path assumes the input is already a UTF-8 string. For file input, decode first with `decodeArrayBuffer` from `@vitelab/core` (handles rekordbox's UTF-16LE + BOM), then call `parseInput`.

```ts
import { decodeArrayBuffer } from '@vitelab/core';
import { parseInput } from '@vitelab/dj-domain';

const text = decodeArrayBuffer(await file.arrayBuffer());
const result = parseInput(text);
if (result) {
  console.log(result.format, result.tracks.length);
}
```

### `class RekordboxTsvParser implements ITrackParser`

Parser for rekordbox TSV exports. Headers are mapped dynamically, so column presence and order don't matter; unknown headers are preserved in `_raw`. Uses the Japanese header labels rekordbox emits. The "My Tag" column is split on `" / "` into `tags`. `format` is `'tsv'`; `canParse` returns true when the first non-empty line contains a tab.

### `class M3u8Parser implements ITrackParser`

Parser for extended M3U (`.m3u8`) playlists. Each `#EXTINF:<seconds>,<display>` line plus its following path line becomes a `Track`. `display` is split on the first `" - "` into artist/title; `durationSec` yields `time` via `formatClock`; the path's last segment becomes `fileName`. m3u8 carries no BPM/key/tags/album. `format` is `'m3u8'`; `canParse` returns true when the first non-empty line starts with `#EXTM3U`.

```ts
import { M3u8Parser, RekordboxTsvParser } from '@vitelab/dj-domain';

const parser = new M3u8Parser();
if (parser.canParse(text)) {
  const tracks = parser.parse(text);
}
```

## License

[MIT](../../LICENSE) © 2026 MasaKoha
