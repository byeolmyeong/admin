import { describe, expect, it } from 'vitest';
import { codePointLength, formatDateTime, formatKst, mailtoHref, oneLine, utf8ByteLength } from './text';

describe('codePointLength', () => {
  it('한글 한 글자와 이모지 한 개를 1로 센다', () => {
    expect(codePointLength('가나다')).toBe(3);
    expect(codePointLength('😀')).toBe(1);
    expect('😀'.length).toBe(2);
    expect(codePointLength('')).toBe(0);
  });
});

describe('utf8ByteLength', () => {
  it('영문은 1바이트, 한글은 3바이트', () => {
    expect(utf8ByteLength('a'.repeat(72))).toBe(72);
    expect(utf8ByteLength('가'.repeat(24))).toBe(72);
    expect(utf8ByteLength('가'.repeat(25))).toBe(75);
  });
});

describe('oneLine', () => {
  it('줄바꿈과 이어진 공백을 한 칸으로 줄인다', () => {
    expect(oneLine('첫 줄\n\n  둘째   줄', 80)).toBe('첫 줄 둘째 줄');
  });
  it('코드 포인트로 잘라 말줄임표를 붙인다', () => {
    expect(oneLine('😀😀😀😀', 2)).toBe('😀😀…');
    expect(oneLine('가나', 2)).toBe('가나');
  });
});

describe('formatDateTime', () => {
  it('UTC 시각을 한국 시간으로 적는다', () => {
    expect(formatDateTime('2026-11-12T04:05:06Z')).toBe('2026-11-12 13:05');
    expect(formatDateTime('2026-12-31T15:00:00Z')).toBe('2027-01-01 00:00');
  });
  it('읽을 수 없는 값은 그대로 돌려준다', () => {
    expect(formatDateTime('어제')).toBe('어제');
  });
});

describe('formatKst', () => {
  it('UTC 시각을 한국 시각 YYYY.MM.DD HH:mm:ss 로 적는다(결정 003 의 7)', () => {
    expect(formatKst('2026-11-19T23:01:12Z')).toBe('2026.11.20 08:01:12');
    expect(formatKst('2026-12-31T15:00:00Z')).toBe('2027.01.01 00:00:00');
    expect(formatKst('2026-11-20T00:00:05.789Z')).toBe('2026.11.20 09:00:05');
  });
  it('자정 · 한 자리 달과 날도 두 자리로 적는다', () => {
    expect(formatKst('2026-01-04T15:00:00Z')).toBe('2026.01.05 00:00:00');
  });
  it('읽을 수 없는 값은 그대로 돌려준다', () => {
    expect(formatKst('어제')).toBe('어제');
  });
});

describe('mailtoHref', () => {
  it('주소만 넣고, 제목·본문을 끼워 넣을 수 있는 글자는 인코딩한다', () => {
    expect(mailtoHref('user@example.com')).toBe('mailto:user@example.com');
    expect(mailtoHref('a@b.c?subject=x&body=y')).toBe('mailto:a@b.c%3Fsubject%3Dx%26body%3Dy');
  });
});
