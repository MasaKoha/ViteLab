# @vitelab/core

[English](README.md)

ViteLab のアプリ間で共有する、依存ゼロの TypeScript ヘルパー群。すべての関数はランタイム依存を持たない純粋関数であり、DOM / canvas へのアクセス（`extractAccent` でピクセルを読むなど）は呼び出し側の責務とする。

```ts
import {
  formatClock,
  parseClock,
  bytesToBase64,
  base64ToBytes,
  toBase64Url,
  fromBase64Url,
  decodeArrayBuffer,
  normalizeSource,
  firstNonEmptyLine,
  escapeHtml,
  clamp,
  lerp,
  roundTo,
  splitColor,
  joinColor,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  extractAccent,
} from '@vitelab/core';
```

## 時刻（Clock）

### `formatClock(totalSeconds: number): string`

秒数を時刻文字列にフォーマットする。1 時間未満は `mm:ss`、1 時間以上は `h:mm:ss`。負の値や非有限値（`NaN` / `Infinity`）は `0` として扱う。秒は切り捨てる。

```ts
formatClock(75); // "1:15"
formatClock(3661); // "1:01:01"
formatClock(-5); // "0:00"
```

### `parseClock(text: string): number | null`

`mm:ss` または `h:mm:ss` の文字列を合計秒数にパースする。入力は前後の空白を除去する。分・秒は 2 桁（`0`–`59`）である必要があるが、`mm:ss` 形式の分フィールドはラウンドトリップを可能にするため 59 を超えてもよい（例: `90:00`）。マッチしない場合は `null` を返す。

```ts
parseClock('1:15'); // 75
parseClock('1:01:01'); // 3661
parseClock('90:00'); // 5400
parseClock('abc'); // null
```

## バイナリ & エンコーディング

### `bytesToBase64(bytes: Uint8Array): string`

バイト配列を標準の base64 文字列に変換する。大きな入力は内部でチャンク分割（1 チャンク 32 KB）し、`btoa` の引数長制限に引っかからないようにしている。

### `base64ToBytes(base64: string): Uint8Array`

標準の base64 文字列をバイト列に戻す。

### `toBase64Url(bytes: Uint8Array): string`

バイト列を base64url に変換する。`+`→`-`、`/`→`_`、末尾の `=` パディングは除去する。

### `fromBase64Url(base64Url: string): Uint8Array`

base64url 文字列をバイト列に戻す。パディングは自動で復元される。

```ts
const bytes = new Uint8Array([1, 2, 3]);
const url = toBase64Url(bytes); // "AQID"
fromBase64Url(url); // Uint8Array [1, 2, 3]
base64ToBytes(bytesToBase64(bytes)); // Uint8Array [1, 2, 3]
```

### `decodeArrayBuffer(buffer: ArrayBuffer): string`

`ArrayBuffer` をエンコーディング自動判定で文字列にデコードする。BOM が最優先される（UTF-16LE `FF FE`、UTF-16BE `FE FF`、UTF-8 `EF BB BF`）。BOM がない場合は先頭 512 バイト内の NUL バイトのパリティで UTF-16 のバイトオーダーを推測し、それ以外は UTF-8 とみなす。残った `U+FEFF` 文字はすべて除去する。rekordbox のエクスポート（UTF-16LE + BOM）と m3u8 ファイル（UTF-8）を単一の入口で読むのに便利。

```ts
const text = decodeArrayBuffer(await file.arrayBuffer());
```

## テキスト

### `normalizeSource(source: string): string`

すべての BOM（`U+FEFF`）文字を除去し、改行コード（`\r\n` と `\r`）を `\n` に正規化する。パーサーの前処理として使う。

### `firstNonEmptyLine(normalized: string): string`

空白以外の内容を持つ最初の行を返す。存在しない場合は `''`。フォーマット判定に使う。正規化済み（`\n`）のテキストを前提とする。

### `escapeHtml(value: string): string`

`&`、`<`、`>` をエスケープし、HTML テキストノードとして安全に挿入できるようにする（属性コンテキストは対象外）。

```ts
normalizeSource('a\r\nb'); // "a\nb"
firstNonEmptyLine('\n\n  hi '); // "  hi "
escapeHtml('<a> & <b>'); // "&lt;a&gt; &amp; &lt;b&gt;"
```

## 数値演算（Math）

### `clamp(value: number, min: number, max: number): number`

`value` を `[min, max]` の範囲に丸める。

### `lerp(from: number, to: number, t: number): number`

`from` から `to` への線形補間（`t` は通常 `0`–`1`）。

### `roundTo(value: number, digits: number): number`

`value` を小数第 `digits` 位に丸める（`Math.round` により 0 から離れる側へ丸める）。

```ts
clamp(12, 0, 10); // 10
lerp(0, 100, 0.25); // 25
roundTo(3.14159, 2); // 3.14
```

## 色（Color）

### 型定義

```ts
interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
} // 0–255
interface HslColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
} // h: 0–360, s/l: 0–1
interface AccentProfile {
  readonly h: number;
  readonly s: number;
  readonly l: number;
} // s/l: 0–1
```

### `splitColor(hex8: string): { rgb: string; alpha: number }`

`#RRGGBBAA` を `#RRGGBB` 部分とアルファ値（0–255）に分割する。

### `joinColor(rgb: string, alpha: number): string`

`#RRGGBB` 文字列とアルファ（0–255）を結合して `#RRGGBBAA` にする。アルファは丸めて `[0, 255]` にクランプし、大文字の 16 進数で出力する。

### `hexToRgb(hex: string): RgbColor`

`#RRGGBB`（先頭の `#` は省略可）を `RgbColor` にパースする。

### `rgbToHex(rgb: RgbColor): string`

`RgbColor` を `#RRGGBB`（大文字、各チャンネルを丸めて `[0, 255]` にクランプ）にフォーマットする。

### `rgbToHsl(rgb: RgbColor): HslColor`

RGB を HSL に変換する。

### `hslToRgb(hsl: HslColor): RgbColor`

HSL を RGB に変換する。色相は 360 で剰余をとって正規化されるため、負の値や範囲外の色相も受け付ける。

```ts
splitColor('#3366CCFF'); // { rgb: '#3366CC', alpha: 255 }
joinColor('#3366CC', 128); // "#3366CC80"
hexToRgb('#3366CC'); // { r: 51, g: 102, b: 204 }
rgbToHex({ r: 51, g: 102, b: 204 }); // "#3366CC"
rgbToHsl({ r: 51, g: 102, b: 204 }); // { h: 220, s: ~0.6, l: 0.5 }
```

### `extractAccent(pixels: Uint8ClampedArray | Uint8Array, pixelStride?: number): AccentProfile | null`

RGBA ピクセルバッファから支配的なアクセントカラーを抽出する。色相を 36 個のバケット（各 10°）に分類し、最も重みの大きいバケットを選ぶ。ほぼ透明、低彩度、黒に近い／白に近いピクセルは無視する。返される彩度・明度は見栄えの良い範囲にクランプされる。どのバケットも十分な重みを集められなかった場合は `null` を返す。

`pixelStride` はサンプリングの刻み幅で、単位は**配列要素（バイト）**。デフォルトは `4`（全ピクセル）。4 の倍数で大きい値を渡すとサブサンプリングになる。例えば `16` なら 4 ピクセルに 1 つ読む。

ピクセルの取得（canvas の `getImageData().data` など）は呼び出し側の責務であり、この関数はヒストグラム計算のみを行う。

```ts
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const accent = extractAccent(imageData.data, 16);
if (accent) {
  const rgb = hslToRgb(accent);
  element.style.setProperty('--accent', rgbToHex(rgb));
}
```

## ライセンス

[MIT](../../LICENSE) © 2026 MasaKoha
