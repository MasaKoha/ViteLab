import { describe, expect, it } from 'vitest';
import { camelotToMusical, isCamelot, normalizeToCamelot } from './keyNotation.js';

describe('keyNotation', () => {
  it('Camelot → 純正キー変換', () => {
    expect(camelotToMusical('2A')).toBe('Ebm');
    expect(camelotToMusical('4A')).toBe('Fm');
    expect(camelotToMusical('8B')).toBe('C');
    expect(camelotToMusical('11A')).toBe('Gbm');
  });

  it('純正キー → Camelot（往復）', () => {
    expect(normalizeToCamelot('Ebm')).toBe('2A');
    expect(normalizeToCamelot('Fm')).toBe('4A');
    expect(normalizeToCamelot('C')).toBe('8B');
  });

  it('表記ゆれを吸収する（min / シャープ / 全角記号）', () => {
    expect(normalizeToCamelot('F min')).toBe('4A');
    expect(normalizeToCamelot('F#m')).toBe('11A'); // F#m = Gbm = 11A
    expect(normalizeToCamelot('D#m')).toBe('2A'); // D#m = Ebm = 2A
    expect(normalizeToCamelot('C#m')).toBe('12A'); // C#m = Dbm = 12A
  });

  it('Camelot 判定', () => {
    expect(isCamelot('4A')).toBe(true);
    expect(isCamelot('12B')).toBe(true);
    expect(isCamelot('Fm')).toBe(false);
  });

  it('既に Camelot ならそのまま大文字化', () => {
    expect(normalizeToCamelot('4a')).toBe('4A');
  });
});
