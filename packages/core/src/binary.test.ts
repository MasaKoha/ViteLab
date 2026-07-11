import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  decodeArrayBuffer,
  fromBase64Url,
  toBase64Url,
} from './binary';

// 0x8000 チャンク境界を跨ぐサイズも含めて round-trip を確認する。
const ChunkBoundary = 0x8000;

function createBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = index % 256;
  }
  return bytes;
}

describe('bytesToBase64 / base64ToBytes', () => {
  it('任意長のバイト列を round-trip で完全復元する（チャンク境界含む）', () => {
    for (const length of [0, 1, 255, 1000, ChunkBoundary - 1, ChunkBoundary, ChunkBoundary + 1]) {
      const source = createBytes(length);
      const restored = base64ToBytes(bytesToBase64(source));
      expect(Array.from(restored)).toEqual(Array.from(source));
    }
  });
});

describe('toBase64Url / fromBase64Url', () => {
  it('base64url は +/= を含まない', () => {
    const source = createBytes(300);
    const encoded = toBase64Url(source);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('round-trip で復元できる（パディング復元含む）', () => {
    for (const length of [1, 2, 3, 4, 5, 16]) {
      const source = createBytes(length);
      const restored = fromBase64Url(toBase64Url(source));
      expect(Array.from(restored)).toEqual(Array.from(source));
    }
  });
});

describe('decodeArrayBuffer', () => {
  it('UTF-8 BOM 付きバッファを BOM 除去してデコードする', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x62, 0x63]);
    expect(decodeArrayBuffer(bytes.buffer)).toBe('abc');
  });

  it('UTF-16LE BOM 付きバッファをデコードする', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x61, 0x00, 0x62, 0x00]);
    expect(decodeArrayBuffer(bytes.buffer)).toBe('ab');
  });

  it('UTF-16BE BOM 付きバッファをデコードする', () => {
    const bytes = new Uint8Array([0xfe, 0xff, 0x00, 0x61, 0x00, 0x62]);
    expect(decodeArrayBuffer(bytes.buffer)).toBe('ab');
  });

  it('BOM 無し ASCII バッファは UTF-8 としてデコードする', () => {
    const bytes = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(decodeArrayBuffer(bytes.buffer)).toBe('hello');
  });
});
