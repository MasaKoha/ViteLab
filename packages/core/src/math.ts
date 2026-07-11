/**
 * 数値計算の汎用ユーティリティを提供するモジュール。
 * 依存ゼロの純粋関数のみで構成する。
 */

/** 値を `[min, max]` の範囲へ丸め込む。 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** `from` から `to` への線形補間（`t` は通常 0〜1）。 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 値を指定桁数（小数点以下 `digits` 桁）で四捨五入する。 */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
