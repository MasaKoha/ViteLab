import { describe, expect, it } from 'vitest';
import { RekordboxTsvParser } from './rekordboxTsv.js';

const HEADER = [
  '#',
  'アーティスト',
  'トラックタイトル',
  'アルバム',
  'BPM',
  'キー',
  '時間',
  'マイタグ',
  'コメント',
].join('\t');

function buildTsv(rows: string[][]): string {
  return [HEADER, ...rows.map((cells) => cells.join('\t'))].join('\r\n');
}

describe('RekordboxTsvParser', () => {
  const parser = new RekordboxTsvParser();

  it('カラム数・トラック数を正しく解釈する', () => {
    const source = buildTsv([
      ['1', 'Artist A', 'Title A', 'Album A', '128.00', '4A', '5:30', 'Peak / Vocal', 'note'],
      ['2', 'Artist B', 'Title B', 'Album B', '124.00', '2A', '6:00', '', ''],
    ]);
    const tracks = parser.parse(source);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      no: '1',
      artist: 'Artist A',
      title: 'Title A',
      album: 'Album A',
      bpm: '128.00',
      key: '4A',
      time: '5:30',
    });
  });

  it('マイタグを " / " で分解し、空要素を除去する', () => {
    const source = buildTsv([['1', 'A', 'T', '', '', '', '', 'Peak /  / Vocal ', '']]);
    const tracks = parser.parse(source);
    expect(tracks[0]!.tags).toEqual(['Peak', 'Vocal']);
  });

  it('未知カラムを _raw に保持する', () => {
    const header = ['#', 'アーティスト', '謎カラム'].join('\t');
    const source = [header, ['1', 'A', 'X'].join('\t')].join('\n');
    const tracks = parser.parse(source);
    expect(tracks[0]!._raw?.['謎カラム']).toBe('X');
    // コメント等の既知だが Track フィールド外のカラムも _raw から辿れる
    expect(tracks[0]!._raw?.['no']).toBe('1');
  });

  it('キーを Camelot 正規形へ変換して保持する', () => {
    const source = buildTsv([['1', 'A', 'T', '', '', 'Fm', '', '', '']]);
    const tracks = parser.parse(source);
    expect(tracks[0]!.key).toBe('4A');
  });

  it('canParse はタブ区切りヘッダーで true', () => {
    expect(parser.canParse(HEADER)).toBe(true);
    expect(parser.canParse('#EXTM3U')).toBe(false);
  });
});
