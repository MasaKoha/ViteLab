import { describe, expect, it } from 'vitest';
import { formatClock, parseClock } from './clock';

describe('formatClock', () => {
  it('60分未満は mm:ss で整形する', () => {
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(210)).toBe('3:30');
  });

  it('小数点以下は切り捨てる', () => {
    expect(formatClock(59.9)).toBe('0:59');
  });

  it('60分以上は h:mm:ss で整形する', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3661)).toBe('1:01:01');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('負値・非数は 0 に丸める', () => {
    expect(formatClock(-1)).toBe('0:00');
    expect(formatClock(Number.NaN)).toBe('0:00');
  });
});

describe('parseClock', () => {
  it('mm:ss を秒数へ変換する', () => {
    expect(parseClock('1:15')).toBe(75);
    expect(parseClock('0:09')).toBe(9);
    expect(parseClock('59:59')).toBe(3599);
  });

  it('h:mm:ss を秒数へ変換する', () => {
    expect(parseClock('1:00:00')).toBe(3600);
    expect(parseClock('1:01:01')).toBe(3661);
  });

  it('前後の空白は無視する', () => {
    expect(parseClock('  1:15 ')).toBe(75);
  });

  it('解析できない文字列は null', () => {
    expect(parseClock('abc')).toBeNull();
    expect(parseClock('1:75')).toBeNull();
    expect(parseClock('1:5:00')).toBeNull();
    expect(parseClock('')).toBeNull();
  });

  it('formatClock の出力を再度 parseClock で復元できる（往復可能性）', () => {
    for (const seconds of [0, 9, 75, 3599, 3600, 3661]) {
      expect(parseClock(formatClock(seconds))).toBe(seconds);
    }
  });
});
