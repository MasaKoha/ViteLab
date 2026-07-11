import { firstNonEmptyLine, normalizeSource } from '@vitelab/core';
import { normalizeToCamelot } from '../keyNotation.js';
import type { ITrackParser, SourceFormat, Track } from '../track.js';

/**
 * rekordbox の TSV エクスポートパーサ。
 * ヘッダーは動的にマッピングし、カラムの有無・順序に依存しない。
 * 未知のヘッダーは `_raw` に保持する。
 */
export class RekordboxTsvParser implements ITrackParser {
  public readonly format: SourceFormat = 'tsv';

  /** JP ヘッダーラベル → 正規キー の対応表。エクスポート設定でカラムは増減する。 */
  private static readonly HEADER_MAP: Record<string, string> = {
    '#': 'no',
    BPM: 'bpm',
    年: 'year',
    追加日: 'dateAdded',
    カラー: 'color',
    メッセージ: 'message',
    作成日: 'dateCreated',
    場所: 'location',
    ファイル名: 'fileName',
    リリース日: 'releaseDate',
    オリジナルアーティスト: 'originalArtist',
    レーベル: 'label',
    リミキサー: 'remixer',
    ミックスネーム: 'mixName',
    作詞者: 'lyricist',
    作曲者: 'composer',
    トラック番号: 'trackNumber',
    アルバムアーティスト: 'albumArtist',
    ディスク番号: 'discNumber',
    サイズ: 'size',
    評価: 'rating',
    ジャンル: 'genre',
    キー: 'key',
    時間: 'time',
    トラックタイトル: 'title',
    DJプレイ回数: 'playCount',
    アーティスト: 'artist',
    アルバム: 'album',
    アートワーク: 'artwork',
    コメント: 'comment',
    マイタグ: 'myTag',
    サンプルレート: 'sampleRate',
    ビット深度: 'bitDepth',
    ファイルの種類: 'fileType',
    ビットレート: 'bitRate',
  };

  /** `_raw` の正規キー → Track フィールドへ写経する対象。 */
  private static readonly DIRECT_FIELDS = [
    'no',
    'artist',
    'title',
    'album',
    'bpm',
    'time',
    'rating',
    'playCount',
    'genre',
    'label',
    'year',
    'remixer',
    'location',
    'fileName',
  ] as const;

  /** 先頭の非空白行にタブが含まれれば TSV とみなす（m3u8 は先に判定済み）。 */
  public canParse(source: string): boolean {
    return firstNonEmptyLine(normalizeSource(source)).includes('\t');
  }

  public parse(source: string): Track[] {
    const lines = normalizeSource(source).split('\n');
    const headerIndex = lines.findIndex((line) => line.trim().length > 0);
    if (headerIndex < 0) {
      return [];
    }
    const headerLabels = lines[headerIndex]!.split('\t').map((label) => label.trim());

    const tracks: Track[] = [];
    for (let index = headerIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (line.trim().length === 0) {
        continue;
      }
      tracks.push(this.buildTrack(headerLabels, line.split('\t')));
    }
    return tracks;
  }

  /** ヘッダーと 1 行分のセルから Track を組み立てる。 */
  private buildTrack(headerLabels: string[], cells: string[]): Track {
    const raw: Record<string, string> = {};
    for (let column = 0; column < headerLabels.length; column += 1) {
      const label = headerLabels[column] ?? '';
      const value = cells[column] ?? '';
      // 正規キーが分かればそれを、未知ラベルは元ラベルを保険として保持する
      const canonicalKey = RekordboxTsvParser.HEADER_MAP[label] ?? label;
      raw[canonicalKey] = value;
    }

    const track: Track = { tags: this.parseTags(raw['myTag']) };
    for (const field of RekordboxTsvParser.DIRECT_FIELDS) {
      const value = raw[field];
      if (value !== undefined && value.length > 0) {
        track[field] = value;
      }
    }
    // キーは Camelot へ正規化して保持する
    const keyValue = raw['key'];
    if (keyValue !== undefined && keyValue.length > 0) {
      track.key = normalizeToCamelot(keyValue);
    }
    track._raw = raw;
    return track;
  }

  /** `マイタグ` を " / " 区切りで配列化する（各要素 trim、空要素除去）。 */
  private parseTags(value: string | undefined): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(' / ')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
}
