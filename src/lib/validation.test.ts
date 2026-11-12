import { describe, expect, it } from 'vitest';
import { isValidLoginId, isValidName, normalizeLoginId, passwordProblem } from './validation';

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
