# @vitelab/dj-domain

[English](README.md)

DJ トラックリストの中核ドメインロジック。Camelot ⇄ 音名のキー表記変換、共通の正規化済み `Track` モデル、そして rekordbox TSV と m3u8 エクスポートのパーサーを提供する。テキスト正規化とエンコーディング判定は [`@vitelab/core`](../core) に委譲しており、ロジックの重複はない。

OpenKey 表記は意図的に非対応としている（どちらの元アプリでも使っていなかったため）が、`KeyNotation` は後から拡張できるよう型付けされている。

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

## キー表記

`Track.key` は常に正規化された Camelot 形式（例: `"4A"`）で保持される。音名表記はマイナーに `m` サフィックス、フラットに `b` を使う（例: `"Fm"`、`"Ab"`）。

### `type KeyNotation = 'camelot' | 'musical'`

`resolveKey` の出力表記を選ぶセレクタ。

### `isCamelot(value: string): boolean`

（前後の空白を除去した）値が Camelot 表記かどうかを返す（例: `"4A"`、`"12B"`）。大文字小文字は区別しない。

### `normalizeToCamelot(value: string): string`

任意のキー表記を正規化された Camelot に変換する。Camelot 入力は大文字化され、音名入力は変換テーブルで解決される（`"F min"`、`"F#m"`、`"Gbm"` といった変種や `♯`/`♭` グリフも吸収する）。解決できない場合は、前後の空白を除去した入力をそのまま返す。

### `camelotToMusical(camelot: string): string`

Camelot を音名表記に変換する。未知の入力はそのまま返す。

### `resolveKey(key: string | undefined, notation: KeyNotation): string`

保持された（Camelot）キーを表示用に指定の表記へ解決する。空／`undefined` の場合は `''` を返す。`'camelot'` ならキーをそのまま返し、`'musical'` なら変換する。

```ts
isCamelot('4A'); // true
normalizeToCamelot('F min'); // "4A"
normalizeToCamelot('F#m'); // "11A"
camelotToMusical('4A'); // "Fm"
resolveKey('4A', 'musical'); // "Fm"
resolveKey(undefined, 'camelot'); // ""
```

## Track モデル

### `interface Track`

正規化されたトラック。`tags` を除くすべてのフィールドは省略可能（ソースごとに持つ情報が異なるため「存在するものだけを持つ」方針）。マッピングされなかった元の列は、セーフティネットとして `_raw` に保持される。

| フィールド     | 型                        | 補足                                                                 |
| ------------- | ------------------------- | -------------------------------------------------------------------- |
| `no`          | `string?`                 | トラック番号 / 行インデックス。                                       |
| `artist`      | `string?`                 |                                                                      |
| `title`       | `string?`                 |                                                                      |
| `album`       | `string?`                 |                                                                      |
| `bpm`         | `string?`                 |                                                                      |
| `key`         | `string?`                 | 正規化された Camelot 表記（例: `"4A"`）。                             |
| `tags`        | `string[]`                | 「My Tag」由来。空配列も許容。                                        |
| `durationSec` | `number?`                 | m3u8 由来。タイムスタンプ生成のソース。                              |
| `time`        | `string?`                 | 表示用 `"mm:ss"`（TSV は元の文字列、m3u8 は秒から算出）。            |
| `rating`      | `string?`                 |                                                                      |
| `playCount`   | `string?`                 |                                                                      |
| `genre`       | `string?`                 |                                                                      |
| `label`       | `string?`                 |                                                                      |
| `year`        | `string?`                 |                                                                      |
| `remixer`     | `string?`                 |                                                                      |
| `location`    | `string?`                 | ローカル／クラウドの絶対パス。                                        |
| `fileName`    | `string?`                 |                                                                      |
| `_raw`        | `Record<string, string>?` | 元の列を保持。                                                        |

### `type SourceFormat = 'tsv' | 'm3u8'`

`parseInput` が判定する入力フォーマット。

### `interface ParseResult`

```ts
interface ParseResult {
  format: SourceFormat;
  tracks: Track[];
}
```

### `interface ITrackParser`

パーサーの契約。判定は各パーサーの `canParse` に閉じ込められており、ディスパッチャは登録順にパーサーへ問い合わせる。新フォーマットの追加はパーサー実装を 1 つ足すだけで済む。

```ts
interface ITrackParser {
  /** UI バッジで使うフォーマット ID。 */
  readonly format: SourceFormat;
  /** このパーサーが入力を扱えるか。副作用を持ってはならない。 */
  canParse(source: string): boolean;
  /** 入力を正規化された Track 配列に変換する。 */
  parse(source: string): Track[];
}
```

## パーサー

### `parseInput(source: string): ParseResult | null`

フォーマットを判定するディスパッチャ。先に m3u8 を問い合わせ（TSV 判定はタブの緩いチェックのため）、最初にマッチしたパーサーへ委譲する。空入力の場合、またはどのパーサーもマッチしない場合は `null` を返す。

ペースト経路では入力が既に UTF-8 文字列であることを前提とする。ファイル入力では、まず `@vitelab/core` の `decodeArrayBuffer` でデコード（rekordbox の UTF-16LE + BOM を処理）してから `parseInput` を呼ぶこと。

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

rekordbox TSV エクスポート用のパーサー。ヘッダーは動的にマッピングされるため、列の有無や順序は問わない。未知のヘッダーは `_raw` に保持される。rekordbox が出力する日本語のヘッダーラベルを使う。「My Tag」列は `" / "` で分割して `tags` にする。`format` は `'tsv'`。`canParse` は最初の非空行にタブが含まれる場合に true を返す。

### `class M3u8Parser implements ITrackParser`

拡張 M3U（`.m3u8`）プレイリスト用のパーサー。各 `#EXTINF:<秒数>,<表示名>` 行と、それに続くパス行が 1 つの `Track` になる。`表示名` は最初の `" - "` でアーティスト／タイトルに分割し、`durationSec` は `formatClock` を通じて `time` を生成し、パスの末尾セグメントが `fileName` になる。m3u8 は BPM／キー／タグ／アルバムを持たない。`format` は `'m3u8'`。`canParse` は最初の非空行が `#EXTM3U` で始まる場合に true を返す。

```ts
import { M3u8Parser, RekordboxTsvParser } from '@vitelab/dj-domain';

const parser = new M3u8Parser();
if (parser.canParse(text)) {
  const tracks = parser.parse(text);
}
```

## ライセンス

[MIT](../../LICENSE) © 2026 MasaKoha
