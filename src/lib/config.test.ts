import { describe, expect, it } from 'vitest';
import { normalizeApiUrl, parseHiddenSections } from './config';

describe('normalizeApiUrl', () => {
  it('끝의 / 를 떼고, 비었거나 http(s) 주소가 아니면 null', () => {
    expect(normalizeApiUrl('http://localhost:8080/')).toBe('http://localhost:8080');
    expect(normalizeApiUrl(' https://api.example.com ')).toBe('https://api.example.com');
    expect(normalizeApiUrl('')).toBeNull();
    expect(normalizeApiUrl(undefined)).toBeNull();
    expect(normalizeApiUrl('localhost:8080')).toBeNull();
  });
});

describe('parseHiddenSections', () => {
  it('쉼표로 나눈 구역 이름을 주소로, 공백 · 대문자 · 앞의 / · 틀린 이름은 정리한다', () => {
    expect(parseHiddenSections('users,push')).toEqual(['/users', '/push']);
    expect(parseHiddenSections(' Users , /push ,, <x> ')).toEqual(['/users', '/push']);
    expect(parseHiddenSections('')).toEqual([]);
    expect(parseHiddenSections(undefined)).toEqual([]);
  });
});
