import { describe, expect, it } from 'vitest';
import {
  extractAccent,
  hexToRgb,
  hslToRgb,
  joinColor,
  rgbToHex,
  rgbToHsl,
  splitColor,
} from './color';

describe('splitColor / joinColor', () => {
  it('#RRGGBBAA を RGB とアルファに分解する', () => {
    expect(splitColor('#112233FF')).toEqual({ rgb: '#112233', alpha: 255 });
  });

  it('RGB とアルファから #RRGGBBAA を合成する', () => {
    expect(joinColor('#112233', 255)).toBe('#112233FF');
    expect(joinColor('#112233', 0)).toBe('#11223300');
  });

  it('alpha は 0-255 の範囲に丸め込む', () => {
    expect(joinColor('#112233', 300)).toBe('#112233FF');
    expect(joinColor('#112233', -10)).toBe('#11223300');
  });

  it('round-trip で復元できる', () => {
    const hex8 = '#AABBCC80';
    const { rgb, alpha } = splitColor(hex8);
    expect(joinColor(rgb, alpha)).toBe(hex8);
  });
});

describe('hexToRgb / rgbToHex', () => {
  it('# 有無どちらも解析できる', () => {
    expect(hexToRgb('#FF0080')).toEqual({ r: 255, g: 0, b: 128 });
    expect(hexToRgb('FF0080')).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('round-trip で復元できる', () => {
    expect(rgbToHex(hexToRgb('#00FF80'))).toBe('#00FF80');
  });
});

describe('rgbToHsl / hslToRgb', () => {
  it('原色を正しく変換する', () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 5);
    expect(hsl.s).toBeCloseTo(1, 5);
    expect(hsl.l).toBeCloseTo(0.5, 5);
  });

  it('グレーは彩度0になる', () => {
    const hsl = rgbToHsl({ r: 128, g: 128, b: 128 });
    expect(hsl.s).toBe(0);
  });

  it('round-trip でおおむね復元できる', () => {
    const original = { r: 30, g: 200, b: 90 };
    const restored = hslToRgb(rgbToHsl(original));
    expect(restored.r).toBeCloseTo(original.r, 0);
    expect(restored.g).toBeCloseTo(original.g, 0);
    expect(restored.b).toBeCloseTo(original.b, 0);
  });
});

describe('extractAccent', () => {
  function createSolidPixels(r: number, g: number, b: number, count: number): Uint8ClampedArray {
    const pixels = new Uint8ClampedArray(count * 4);
    for (let index = 0; index < count; index += 1) {
      pixels[index * 4] = r;
      pixels[index * 4 + 1] = g;
      pixels[index * 4 + 2] = b;
      pixels[index * 4 + 3] = 255;
    }
    return pixels;
  }

  it('単色（赤）の画像から赤系の主要色を抽出する', () => {
    const profile = extractAccent(createSolidPixels(220, 40, 40, 64));
    expect(profile).not.toBeNull();
    expect(profile?.h).toBeLessThanOrEqual(15);
  });

  it('全透明のピクセル列は null を返す', () => {
    const pixels = new Uint8ClampedArray(64 * 4);
    expect(extractAccent(pixels)).toBeNull();
  });

  it('グレー一色（彩度0）は null を返す', () => {
    expect(extractAccent(createSolidPixels(128, 128, 128, 64))).toBeNull();
  });
});
