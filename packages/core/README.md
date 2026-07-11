# @vitelab/core

[日本語版はこちら](README.ja.md)

Dependency-free TypeScript helpers shared across ViteLab apps. Every function is a pure function with zero runtime dependencies; DOM/canvas access (e.g. reading pixels for `extractAccent`) is the caller's responsibility.

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

## Clock

### `formatClock(totalSeconds: number): string`

Formats seconds as a clock string: `mm:ss` under one hour, `h:mm:ss` at one hour or more. Negative and non-finite values (`NaN` / `Infinity`) are treated as `0`. Seconds are floored.

```ts
formatClock(75); // "1:15"
formatClock(3661); // "1:01:01"
formatClock(-5); // "0:00"
```

### `parseClock(text: string): number | null`

Parses a `mm:ss` or `h:mm:ss` string into total seconds. Input is trimmed. Minutes and seconds must be two digits (`0`–`59`); the minutes field of an `mm:ss` string may exceed 59 (e.g. `90:00`) to allow round-tripping. Returns `null` when the string does not match.

```ts
parseClock('1:15'); // 75
parseClock('1:01:01'); // 3661
parseClock('90:00'); // 5400
parseClock('abc'); // null
```

## Binary & encoding

### `bytesToBase64(bytes: Uint8Array): string`

Converts a byte array to a standard base64 string. Large inputs are chunked internally (32 KB per chunk) so `btoa` argument-length limits are not hit.

### `base64ToBytes(base64: string): Uint8Array`

Converts a standard base64 string back to bytes.

### `toBase64Url(bytes: Uint8Array): string`

Converts bytes to base64url: `+`→`-`, `/`→`_`, trailing `=` padding removed.

### `fromBase64Url(base64Url: string): Uint8Array`

Converts a base64url string back to bytes. Padding is restored automatically.

```ts
const bytes = new Uint8Array([1, 2, 3]);
const url = toBase64Url(bytes); // "AQID"
fromBase64Url(url); // Uint8Array [1, 2, 3]
base64ToBytes(bytesToBase64(bytes)); // Uint8Array [1, 2, 3]
```

### `decodeArrayBuffer(buffer: ArrayBuffer): string`

Decodes an `ArrayBuffer` to a string with automatic encoding detection. A BOM takes priority (UTF-16LE `FF FE`, UTF-16BE `FE FF`, UTF-8 `EF BB BF`); without a BOM, the NUL-byte parity in the first 512 bytes is used to guess UTF-16 byte order, otherwise UTF-8 is assumed. Any remaining `U+FEFF` characters are stripped. Useful for reading rekordbox exports (UTF-16LE + BOM) and m3u8 files (UTF-8) through one entry point.

```ts
const text = decodeArrayBuffer(await file.arrayBuffer());
```

## Text

### `normalizeSource(source: string): string`

Removes all BOM (`U+FEFF`) characters and normalizes line endings (`\r\n` and `\r`) to `\n`. Intended as parser preprocessing.

### `firstNonEmptyLine(normalized: string): string`

Returns the first line with non-whitespace content, or `''` if none. Used for format detection. Expects already-normalized (`\n`) text.

### `escapeHtml(value: string): string`

Escapes `&`, `<`, `>` for safe insertion as an HTML text node (attribute contexts are out of scope).

```ts
normalizeSource('a\r\nb'); // "a\nb"
firstNonEmptyLine('\n\n  hi '); // "  hi "
escapeHtml('<a> & <b>'); // "&lt;a&gt; &amp; &lt;b&gt;"
```

## Math

### `clamp(value: number, min: number, max: number): number`

Clamps `value` into `[min, max]`.

### `lerp(from: number, to: number, t: number): number`

Linear interpolation from `from` to `to` (`t` normally `0`–`1`).

### `roundTo(value: number, digits: number): number`

Rounds `value` to `digits` decimal places (half away from zero via `Math.round`).

```ts
clamp(12, 0, 10); // 10
lerp(0, 100, 0.25); // 25
roundTo(3.14159, 2); // 3.14
```

## Color

### Types

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

Splits `#RRGGBBAA` into its `#RRGGBB` part and an alpha value (0–255).

### `joinColor(rgb: string, alpha: number): string`

Combines a `#RRGGBB` string and an alpha (0–255) into `#RRGGBBAA`. Alpha is rounded and clamped to `[0, 255]` and rendered as uppercase hex.

### `hexToRgb(hex: string): RgbColor`

Parses `#RRGGBB` (leading `#` optional) into an `RgbColor`.

### `rgbToHex(rgb: RgbColor): string`

Formats an `RgbColor` as `#RRGGBB` (uppercase, each channel rounded and clamped to `[0, 255]`).

### `rgbToHsl(rgb: RgbColor): HslColor`

Converts RGB to HSL.

### `hslToRgb(hsl: HslColor): RgbColor`

Converts HSL to RGB. Hue is normalized modulo 360, so negative and out-of-range hues are accepted.

```ts
splitColor('#3366CCFF'); // { rgb: '#3366CC', alpha: 255 }
joinColor('#3366CC', 128); // "#3366CC80"
hexToRgb('#3366CC'); // { r: 51, g: 102, b: 204 }
rgbToHex({ r: 51, g: 102, b: 204 }); // "#3366CC"
rgbToHsl({ r: 51, g: 102, b: 204 }); // { h: 220, s: ~0.6, l: 0.5 }
```

### `extractAccent(pixels: Uint8ClampedArray | Uint8Array, pixelStride?: number): AccentProfile | null`

Extracts a dominant accent color from an RGBA pixel buffer by binning hue into 36 buckets (10° each) and picking the highest-weighted bin. Nearly transparent, low-saturation, and near-black/near-white pixels are ignored. The returned saturation/lightness are clamped into a pleasant display range. Returns `null` when no bin gathers enough weight.

`pixelStride` is the sampling step in **array elements** (bytes), default `4` (every pixel). Pass a larger multiple of 4 to subsample — e.g. `16` reads one pixel in four.

The caller is responsible for obtaining pixels (e.g. from a canvas `getImageData().data`); this function performs only the histogram computation.

```ts
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const accent = extractAccent(imageData.data, 16);
if (accent) {
  const rgb = hslToRgb(accent);
  element.style.setProperty('--accent', rgbToHex(rgb));
}
```

## License

[MIT](../../LICENSE) © 2026 MasaKoha
