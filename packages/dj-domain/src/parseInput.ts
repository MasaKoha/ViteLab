import { M3u8Parser } from './parsers/m3u8.js';
import { RekordboxTsvParser } from './parsers/rekordboxTsv.js';
import type { ITrackParser, ParseResult } from './track.js';

/**
 * 形式判別ディスパッチャ。登録順に `canParse` を問い合わせ、最初にマッチしたパーサへ委譲する。
 * m3u8 を先に判定する（TSV 判定はタブ有無の緩い条件のため）。
 */
const PARSERS: readonly ITrackParser[] = [new M3u8Parser(), new RekordboxTsvParser()];

/**
 * 入力テキストを解析して形式と Track 配列を返す。
 * 貼り付け経路は既に UTF-8 文字列である前提（ファイル経路は @vitelab/core の decodeArrayBuffer 後に呼ぶ）。
 * どのパーサも該当しなければ null。
 */
export function parseInput(source: string): ParseResult | null {
  if (source.trim().length === 0) {
    return null;
  }
  for (const parser of PARSERS) {
    if (parser.canParse(source)) {
      return { format: parser.format, tracks: parser.parse(source) };
    }
  }
  return null;
}
