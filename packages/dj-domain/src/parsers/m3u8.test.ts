import { describe, expect, it } from 'vitest';
import { M3u8Parser } from './m3u8.js';

const SAMPLE = [
  '#EXTM3U',
  '#EXTINF:330,Artist A - Title A',
  'C:\\Music\\artistA\\titleA.mp3',
  '#EXTINF:360,Artist B - Title B - Extra',
  '/Users/dj/Music/artistB/titleB.aiff',
  '#EXTINF:200,SoloTrackWithoutSeparator',
  'D:\\x\\solo.wav',
].join('\r\n');

describe('M3u8Parser', () => {
  const parser = new M3u8Parser();

  it('2 行 1 組で durationSec と time を算出する', () => {
    const tracks = parser.parse(SAMPLE);
    expect(tracks).toHaveLength(3);
    expect(tracks[0]).toMatchObject({
      artist: 'Artist A',
      title: 'Title A',
      durationSec: 330,
      time: '5:30',
      fileName: 'titleA.mp3',
    });
  });

  it('最初の " - " でのみ分割する（2 個目以降はタイトルに残す）', () => {
    const tracks = parser.parse(SAMPLE);
    expect(tracks[1]).toMatchObject({
      artist: 'Artist B',
      title: 'Title B - Extra',
    });
  });

  it('" - " が無ければ全体を title、artist は未設定', () => {
    const tracks = parser.parse(SAMPLE);
    expect(tracks[2]!.title).toBe('SoloTrackWithoutSeparator');
    expect(tracks[2]!.artist).toBeUndefined();
  });

  it('パスの末尾セグメントを fileName にする（/ と \\ の両対応）', () => {
    const tracks = parser.parse(SAMPLE);
    expect(tracks[1]!.fileName).toBe('titleB.aiff');
    expect(tracks[0]!.fileName).toBe('titleA.mp3');
  });

  it('canParse は #EXTM3U 始まりで true', () => {
    expect(parser.canParse(SAMPLE)).toBe(true);
    expect(parser.canParse('col1\tcol2')).toBe(false);
  });
});
