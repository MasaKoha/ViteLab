/**
 * バイト列と base64 / base64url / テキストデコードの相互変換を提供するモジュール。
 * 依存ゼロの純粋関数のみで構成する。
 */

// btoa は 1 呼び出しあたりの引数長に実装依存の上限があるため、チャンク分割して結合する。
const Base64ChunkSize = 0x8000;

/** バイト列を base64 文字列へ変換する（大きなバイト列でもチャンク分割して安全に処理する）。 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += Base64ChunkSize) {
    const chunk = bytes.subarray(offset, offset + Base64ChunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

/** base64 文字列をバイト列へ変換する。 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

const Base64UrlPlusPattern = /\+/g;
const Base64UrlSlashPattern = /\//g;
const Base64UrlPaddingPattern = /=+$/;
const Base64UrlDashPattern = /-/g;
const Base64UrlUnderscorePattern = /_/g;
const Base64GroupLength = 4;

/** バイト列を base64url（`+`→`-`, `/`→`_`, パディング除去）へ変換する。 */
export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(Base64UrlPlusPattern, '-')
    .replace(Base64UrlSlashPattern, '_')
    .replace(Base64UrlPaddingPattern, '');
}

/** base64url 文字列をバイト列へ変換する（パディングは自動復元する）。 */
export function fromBase64Url(base64Url: string): Uint8Array {
  const base64 = base64Url
    .replace(Base64UrlDashPattern, '+')
    .replace(Base64UrlUnderscorePattern, '/');
  const paddingLength =
    (Base64GroupLength - (base64.length % Base64GroupLength)) % Base64GroupLength;
  return base64ToBytes(base64 + '='.repeat(paddingLength));
}

type SupportedEncoding = 'utf-16le' | 'utf-16be' | 'utf-8';

// BOM が無いファイルは、先頭サンプル内での NUL バイト出現位置（偶数/奇数）から
// UTF-16 の byte order を推定する。しきい値はサンプル長の 1/8。
const BomDetectionSampleLimit = 512;
const NulByteRatioThreshold = 8;

/** BOM を最優先で見て、無ければ NUL バイトの並びから UTF-16 を推定する。 */
function detectEncoding(bytes: Uint8Array): SupportedEncoding {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }

  const sampleLength = Math.min(bytes.length, BomDetectionSampleLimit);
  let zerosAtEven = 0;
  let zerosAtOdd = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    if (bytes[index] !== 0x00) {
      continue;
    }
    if (index % 2 === 0) {
      zerosAtEven += 1;
    } else {
      zerosAtOdd += 1;
    }
  }
  const threshold = sampleLength / NulByteRatioThreshold;
  if (zerosAtOdd > threshold && zerosAtOdd > zerosAtEven) {
    return 'utf-16le';
  }
  if (zerosAtEven > threshold && zerosAtEven > zerosAtOdd) {
    return 'utf-16be';
  }
  return 'utf-8';
}

const RemainingBomPattern = /﻿/g;

/**
 * ArrayBuffer をエンコーディング自動判定でデコードする。
 * BOM を最優先で見て、無ければ NUL バイトの並びから UTF-16 を推定する（rekordbox の
 * UTF-16LE+BOM、m3u8 の UTF-8 などファイル経路の判別に使う）。
 */
export function decodeArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const encoding = detectEncoding(bytes);
  const decoder = new TextDecoder(encoding);
  const text = decoder.decode(bytes);
  // TextDecoder は BOM を先頭でしか除去しないため、残存 U+FEFF を最終除去する
  return text.replace(RemainingBomPattern, '');
}
