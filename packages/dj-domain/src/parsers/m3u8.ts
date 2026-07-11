import { firstNonEmptyLine, formatClock, normalizeSource } from '@vitelab/core';
import type { ITrackParser, SourceFormat, Track } from '../track.js';

/**
 * m3u8（拡張 M3U）パーサ。
 * `#EXTINF:<秒>,<display>` 行 + パス行の 2 行 1 組を Track へ変換する。
 * BPM/キー/タグ/アルバムは持たない。
 */
export class M3u8Parser implements ITrackParser {
  public readonly format: SourceFormat = 'm3u8';

  /** 先頭の非空白行が `#EXTM3U` で始まれば m3u8 とみなす。 */
  public canParse(source: string): boolean {
    return firstNonEmptyLine(normalizeSource(source)).startsWith('#EXTM3U');
  }

  public parse(source: string): Track[] {
    const lines = normalizeSource(source).split('\n');
    const tracks: Track[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (!line.startsWith('#EXTINF:')) {
        continue;
      }
      // 直後の最初の非空・非コメント行がパス
      const path = this.findPathLine(lines, index + 1);
      tracks.push(this.buildTrack(line, path));
    }

    return tracks;
  }

  /** `#EXTINF:` 行とパス行から Track を組み立てる。 */
  private buildTrack(extinfLine: string, path: string | undefined): Track {
    const { durationSec, display } = this.parseExtinf(extinfLine);
    const { artist, title } = this.splitDisplay(display);

    const track: Track = {
      title,
      tags: [],
    };
    if (artist.length > 0) {
      track.artist = artist;
    }
    if (durationSec !== undefined) {
      track.durationSec = durationSec;
      track.time = formatClock(durationSec);
    }
    if (path && path.length > 0) {
      track.location = path;
      track.fileName = this.lastSegment(path);
    }
    return track;
  }

  /** `#EXTINF:123,Artist - Title` から秒と表示名を取り出す。 */
  private parseExtinf(line: string): { durationSec?: number; display: string } {
    const body = line.slice('#EXTINF:'.length);
    const commaIndex = body.indexOf(',');
    if (commaIndex < 0) {
      return { display: body.trim() };
    }
    const secondsText = body.slice(0, commaIndex).trim();
    const display = body.slice(commaIndex + 1);
    const seconds = Number.parseInt(secondsText, 10);
    // exactOptionalPropertyTypes 下では undefined を代入できないため、有効時のみプロパティを付ける
    if (Number.isFinite(seconds) && seconds >= 0) {
      return { durationSec: seconds, display };
    }
    return { display };
  }

  /** display を「最初の " - " で 1 回だけ」アーティストとタイトルに分割する。 */
  private splitDisplay(display: string): { artist: string; title: string } {
    const separatorIndex = display.indexOf(' - ');
    if (separatorIndex < 0) {
      return { artist: '', title: display.trim() };
    }
    return {
      artist: display.slice(0, separatorIndex).trim(),
      title: display.slice(separatorIndex + 3).trim(),
    };
  }

  /** 指定位置以降で最初の非空・非コメント行を返す。 */
  private findPathLine(lines: string[], start: number): string | undefined {
    for (let index = start; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (line.trim().length === 0) {
        continue;
      }
      if (line.startsWith('#')) {
        // 次の EXTINF に達したら対応するパスは無い
        return undefined;
      }
      return line.trim();
    }
    return undefined;
  }

  /** パスの末尾セグメント（"/" "\" 区切り）をファイル名として返す。 */
  private lastSegment(path: string): string {
    const segments = path.split(/[/\\]/);
    return segments[segments.length - 1] ?? path;
  }
}
