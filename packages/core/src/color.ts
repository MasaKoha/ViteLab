/**
 * カラーの分解・合成、RGB/HSL 変換、画像からの主要色抽出を提供するモジュール。
 * 依存ゼロの純粋関数のみで構成する（DOM/canvas へのアクセスは呼び出し側の責務とする）。
 */
import { clamp } from './math.js';

/** RGB カラー（各成分 0〜255）。 */
export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** HSL カラー（`h` は 0〜360 度、`s`/`l` は 0〜1）。 */
export interface HslColor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** `#RRGGBBAA` を RGB 部（`#RRGGBB`）とアルファ（0〜255）に分解する。 */
export function splitColor(hex8: string): { rgb: string; alpha: number } {
  return {
    rgb: hex8.slice(0, 7),
    alpha: parseInt(hex8.slice(7, 9), 16),
  };
}

/** RGB 部（`#RRGGBB`）とアルファ（0〜255）から `#RRGGBBAA` を合成する。alpha は範囲外なら丸め込む。 */
export function joinColor(rgb: string, alpha: number): string {
  const clampedAlpha = clamp(Math.round(alpha), 0, 255);
  return `${rgb}${clampedAlpha.toString(16).padStart(2, '0').toUpperCase()}`;
}

/** `#RRGGBB`（`#` は省略可）を RGB カラーへ変換する。 */
export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** RGB カラーを `#RRGGBB`（大文字16進2桁）へ変換する。 */
export function rgbToHex(rgb: RgbColor): string {
  const toHexDigits = (value: number): string =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHexDigits(rgb.r)}${toHexDigits(rgb.g)}${toHexDigits(rgb.b)}`;
}

/** RGB カラーを HSL カラーへ変換する。 */
export function rgbToHsl(rgb: RgbColor): HslColor {
  const rNorm = rgb.r / 255;
  const gNorm = rgb.g / 255;
  const bNorm = rgb.b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === rNorm) {
    hue = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
  } else if (max === gNorm) {
    hue = (bNorm - rNorm) / delta + 2;
  } else {
    hue = (rNorm - gNorm) / delta + 4;
  }
  return { h: hue * 60, s: saturation, l: lightness };
}

/** HSL カラーを RGB カラーへ変換する。 */
export function hslToRgb(hsl: HslColor): RgbColor {
  const { s, l } = hsl;
  const hue = ((hsl.h % 360) + 360) % 360;
  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hueToChannel = (t: number): number => {
    let normalizedT = t;
    if (normalizedT < 0) {
      normalizedT += 1;
    }
    if (normalizedT > 1) {
      normalizedT -= 1;
    }
    if (normalizedT < 1 / 6) {
      return p + (q - p) * 6 * normalizedT;
    }
    if (normalizedT < 1 / 2) {
      return q;
    }
    if (normalizedT < 2 / 3) {
      return p + (q - p) * (2 / 3 - normalizedT) * 6;
    }
    return p;
  };

  const hueFraction = hue / 360;
  return {
    r: Math.round(hueToChannel(hueFraction + 1 / 3) * 255),
    g: Math.round(hueToChannel(hueFraction) * 255),
    b: Math.round(hueToChannel(hueFraction - 1 / 3) * 255),
  };
}

/** 抽出した配色プロファイル（`s`/`l` は 0〜1）。 */
export interface AccentProfile {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

interface AccentBin {
  weight: number;
  saturationWeight: number;
  lightnessWeight: number;
}

// hue を 10 度刻みでビン分けし、重み最大のビンを主要色とする。
const AccentHueBinCount = 36;
const AccentHueBinDegrees = 10;
const AccentAlphaThreshold = 0.45;
const AccentMinSaturation = 0.2;
const AccentMinLightness = 0.1;
const AccentMaxLightness = 0.88;
const AccentMinBinWeight = 1.5;
const AccentSaturationRange: readonly [number, number] = [0.58, 0.98];
const AccentLightnessRange: readonly [number, number] = [0.42, 0.68];
const DefaultPixelStride = 4;

/**
 * RGBA ピクセル列から主要色（hue ビンの重み最大）を抽出する。抽出できなければ null。
 * canvas からのピクセル取得は呼び出し側の責務とし、ここでは純粋なヒストグラム計算のみ行う。
 * `pixelStride` はサンプリング間隔（バイト数、既定は全ピクセル走査の 4）。呼び出し側で
 * 間引きたい場合（例: 4 ピクセルごとに 1 回で 16）に指定する。
 */
export function extractAccent(
  pixels: Uint8ClampedArray | Uint8Array,
  pixelStride = DefaultPixelStride,
): AccentProfile | null {
  const bins: AccentBin[] = Array.from({ length: AccentHueBinCount }, () => ({
    weight: 0,
    saturationWeight: 0,
    lightnessWeight: 0,
  }));

  for (let index = 0; index < pixels.length; index += pixelStride) {
    accumulateAccentBin(bins, pixels, index);
  }

  const best = pickBestAccentBin(bins);
  if (best === null) {
    return null;
  }
  return {
    h: (best.index * AccentHueBinDegrees + AccentHueBinDegrees / 2) % 360,
    s: clamp(best.bin.saturationWeight / best.bin.weight, ...AccentSaturationRange),
    l: clamp(best.bin.lightnessWeight / best.bin.weight, ...AccentLightnessRange),
  };
}

function accumulateAccentBin(
  bins: AccentBin[],
  pixels: Uint8ClampedArray | Uint8Array,
  index: number,
): void {
  const alpha = (pixels[index + 3] ?? 0) / 255;
  if (alpha < AccentAlphaThreshold) {
    return;
  }

  const hsl = rgbToHsl({
    r: pixels[index] ?? 0,
    g: pixels[index + 1] ?? 0,
    b: pixels[index + 2] ?? 0,
  });
  if (hsl.s < AccentMinSaturation || hsl.l < AccentMinLightness || hsl.l > AccentMaxLightness) {
    return;
  }

  const saturationWeight = 0.35 + hsl.s * 0.9;
  const lightnessWeight = Math.max(0.2, 1 - Math.abs(hsl.l - 0.55) * 1.3);
  const weight = alpha * saturationWeight * lightnessWeight;
  const binIndex = Math.floor(hsl.h / AccentHueBinDegrees) % AccentHueBinCount;
  const bin = bins[binIndex];
  if (bin === undefined) {
    return;
  }
  bin.weight += weight;
  bin.saturationWeight += hsl.s * weight;
  bin.lightnessWeight += hsl.l * weight;
}

function pickBestAccentBin(bins: AccentBin[]): { index: number; bin: AccentBin } | null {
  let bestIndex = -1;
  let bestWeight = 0;
  for (let index = 0; index < bins.length; index += 1) {
    const bin = bins[index];
    if (bin !== undefined && bin.weight > bestWeight) {
      bestWeight = bin.weight;
      bestIndex = index;
    }
  }
  if (bestIndex < 0 || bestWeight < AccentMinBinWeight) {
    return null;
  }
  const bin = bins[bestIndex];
  if (bin === undefined) {
    return null;
  }
  return { index: bestIndex, bin };
}
