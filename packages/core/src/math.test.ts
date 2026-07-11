import { describe, expect, it } from 'vitest';
import { clamp, lerp, roundTo } from './math';

describe('clamp', () => {
  it('範囲内の値はそのまま返す', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('範囲外の値は境界に丸める', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('負の範囲でも動作する', () => {
    expect(clamp(-20, -10, -5)).toBe(-10);
  });
});

describe('lerp', () => {
  it('t=0/1 で端点を返す', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('中間値を線形補間する', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('範囲外の t（外挿）も許容する', () => {
    expect(lerp(0, 10, 1.5)).toBe(15);
  });
});

describe('roundTo', () => {
  it('digits=0 は整数へ丸める', () => {
    expect(roundTo(1.5, 0)).toBe(2);
    expect(roundTo(1.4, 0)).toBe(1);
  });

  it('指定桁数で四捨五入する', () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.005, 2)).toBeCloseTo(1.0, 5);
  });

  it('負値も丸められる', () => {
    expect(roundTo(-1.25, 1)).toBe(-1.2);
  });
});
