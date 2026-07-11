/**
 * @vitelab/dj-domain — DJ トラックリストの中核ドメイン。
 * Camelot⇔音名のキー表記変換、共通 Track モデル、rekordbox TSV / m3u8 パーサを提供する。
 * テキスト正規化・エンコーディング判定は @vitelab/core に委譲し、重複を持たない。
 */

export {
  type KeyNotation,
  isCamelot,
  normalizeToCamelot,
  camelotToMusical,
  resolveKey,
} from './keyNotation.js';

export type { Track, SourceFormat, ParseResult, ITrackParser } from './track.js';

export { RekordboxTsvParser } from './parsers/rekordboxTsv.js';
export { M3u8Parser } from './parsers/m3u8.js';
export { parseInput } from './parseInput.js';
