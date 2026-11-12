import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  isValidDate,
  isValidLoginId,
  isValidName,
  isValidStoreUrl,
  isValidVersion,
  normalizeLoginId,
  passwordProblem,
} from './validation';

describe('loginId', () => {
  it('앞뒤 공백을 떼고 소문자로 바꾼다', () => {
    expect(normalizeLoginId('  Owner.Kim ')).toBe('owner.kim');
  });
  it('소문자·숫자·._- 3~32자, 첫 글자는 소문자나 숫자', () => {
    expect(isValidLoginId('abc')).toBe(true);
    expect(isValidLoginId('1a_-.')).toBe(true);
    expect(isValidLoginId('a'.repeat(32))).toBe(true);
    expect(isValidLoginId('ab')).toBe(false);
    expect(isValidLoginId('a'.repeat(33))).toBe(false);
    expect(isValidLoginId('.abc')).toBe(false);
    expect(isValidLoginId('Abc')).toBe(false);
    expect(isValidLoginId('가나다')).toBe(false);
  });
});

describe('name', () => {
  it('앞뒤 공백을 뗀 1~40자(코드 포인트)', () => {
    expect(isValidName(' 김 ')).toBe(true);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('😀'.repeat(40))).toBe(true);
    expect(isValidName('가'.repeat(41))).toBe(false);
  });
});

describe('passwordProblem', () => {
  it('10자보다 짧으면 TOO_SHORT', () => {
    expect(passwordProblem('123456789')).toBe('TOO_SHORT');
    expect(passwordProblem('1234567890')).toBeNull();
  });
  it('UTF-8 로 72바이트를 넘으면 TOO_LONG', () => {
    expect(passwordProblem('a'.repeat(72))).toBeNull();
    expect(passwordProblem('a'.repeat(73))).toBe('TOO_LONG');
    expect(passwordProblem('가'.repeat(24))).toBeNull();
    expect(passwordProblem('가'.repeat(25))).toBe('TOO_LONG');
  });
  it('앞뒤 공백을 떼지 않고 센다', () => {
    expect(passwordProblem(' 12345678 ')).toBeNull();
  });
});

describe('날짜(감사 로그의 from · to)', () => {
  it('YYYY-MM-DD 이고 달력에 있는 날이어야 한다', () => {
    expect(isValidDate('2026-11-10')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-11-1')).toBe(false);
    expect(isValidDate('2026-11-10T00:00:00Z')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('앱 설정', () => {
  it('버전: 점으로 나눈 1~3개의 0 이상 정수, 자리마다 숫자 9개까지', () => {
    for (const ok of ['1', '1.2', '1.2.3', '0', '0.0.1', '123456789.0.0', '01.2']) expect(isValidVersion(ok)).toBe(true);
    for (const bad of ['', '1.2.3.4', 'v1.2', '1.2-beta', ' 1.2', '1.2 ', '1..2', '1.', '.1', '1234567890', '1.-2', '１.２']) {
      expect(isValidVersion(bad)).toBe(false);
    }
  });

  it('버전은 숫자로 견주고 빠진 자리는 0 으로 본다', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('2', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('스토어 주소: https:// 로 시작하고 호스트가 있고 공백이 없는 500자 이하', () => {
    expect(isValidStoreUrl('https://apps.apple.com/kr/app/id0000000000')).toBe(true);
    expect(isValidStoreUrl('https://play.google.com/store/apps/details?id=app.example')).toBe(true);
    expect(isValidStoreUrl(`https://a.example/${'a'.repeat(500 - 18)}`)).toBe(true);
    expect(isValidStoreUrl(`https://a.example/${'a'.repeat(500 - 17)}`)).toBe(false);
    for (const bad of ['', 'http://a.example', 'itms-apps://a.example', 'market://details?id=a', 'a.example', 'https://', 'https:///path', ' https://a.example', 'https://a.example ', 'https://a.example/a b', 'HTTPS://a.example']) {
      expect(isValidStoreUrl(bad)).toBe(false);
    }
  });
});
