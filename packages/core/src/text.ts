/**
 * テキストの正規化と HTML エスケープを提供するモジュール。
 * 依存ゼロの純粋関数のみで構成する。
 */

const BomPattern = /﻿/g;
const CrlfPattern = /\r\n/g;
const CrPattern = /\r/g;

/** BOM（U+FEFF）を全除去し、改行コードを LF へ正規化する。各種パーサの前処理として使う。 */
export function normalizeSource(source: string): string {
  // 先頭以外に紛れ込む BOM 文字も含めて全除去する
  const withoutBom = source.replace(BomPattern, '');
  return withoutBom.replace(CrlfPattern, '\n').replace(CrPattern, '\n');
}

/** 正規化後のテキストから先頭の非空白行を返す。形式判別に使う。 */
export function firstNonEmptyLine(normalized: string): string {
  for (const line of normalized.split('\n')) {
    if (line.trim().length > 0) {
      return line;
    }
  }
  return '';
}

const AmpersandPattern = /&/g;
const LessThanPattern = /</g;
const GreaterThanPattern = />/g;

/** HTML テキストノードとして安全な文字列にエスケープする（`&` `<` `>` のみ）。 */
export function escapeHtml(value: string): string {
  return value
    .replace(AmpersandPattern, '&amp;')
    .replace(LessThanPattern, '&lt;')
    .replace(GreaterThanPattern, '&gt;');
}
