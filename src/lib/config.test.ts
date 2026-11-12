import { describe, expect, it } from 'vitest';
import { normalizeApiUrl } from './config';

describe('normalizeApiUrl', () => {
  it('끝의 / 를 떼고, 비었거나 http(s) 주소가 아니면 null', () => {
    expect(normalizeApiUrl('http://localhost:8080/')).toBe('http://localhost:8080');
    expect(normalizeApiUrl(' https://api.example.com ')).toBe('https://api.example.com');
    expect(normalizeApiUrl('')).toBeNull();
    expect(normalizeApiUrl(undefined)).toBeNull();
    expect(normalizeApiUrl('localhost:8080')).toBeNull();
  });
});
