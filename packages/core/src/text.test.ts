import { describe, expect, it } from 'vitest';
import { escapeHtml, firstNonEmptyLine, normalizeSource } from './text';

describe('normalizeSource', () => {
  it('先頭・途中の BOM を除去する', () => {
    expect(normalizeSource('﻿abc﻿def')).toBe('abcdef');
  });

  it('CRLF / CR を LF へ正規化する', () => {
    expect(normalizeSource('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
  });
});

describe('firstNonEmptyLine', () => {
  it('先頭の空行・空白行をスキップして最初の非空行を返す', () => {
    expect(firstNonEmptyLine('\n   \nhello\nworld')).toBe('hello');
  });

  it('非空行が無ければ空文字を返す', () => {
    expect(firstNonEmptyLine('\n \n\n')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('& < > をエスケープする', () => {
    expect(escapeHtml('<a href="x">A & B</a>')).toBe('&lt;a href="x"&gt;A &amp; B&lt;/a&gt;');
  });
});
