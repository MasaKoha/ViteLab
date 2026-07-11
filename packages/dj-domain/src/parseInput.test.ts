import { describe, expect, it } from 'vitest';
import { parseInput } from './parseInput.js';

describe('parseInput 形式判別', () => {
  it('#EXTM3U 始まりは m3u8', () => {
    const result = parseInput('#EXTM3U\n#EXTINF:100,A - B\n/path/b.mp3');
    expect(result?.format).toBe('m3u8');
    expect(result?.tracks).toHaveLength(1);
  });

  it('タブ区切りヘッダーは tsv', () => {
    const result = parseInput('#\tアーティスト\tトラックタイトル\n1\tA\tT');
    expect(result?.format).toBe('tsv');
    expect(result?.tracks).toHaveLength(1);
  });

  it('BOM 付き先頭でも判別できる', () => {
    const result = parseInput('﻿#EXTM3U\n#EXTINF:10,A - B\n/x.mp3');
    expect(result?.format).toBe('m3u8');
  });

  it('空入力は null', () => {
    expect(parseInput('   ')).toBeNull();
  });
});
