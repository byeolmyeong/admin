import { describe, expect, it } from 'vitest';
import { strings } from '../content/strings';
import { ApiError } from './api/client';
import { errorCode, errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('화면의 문구가 먼저, 다음이 공통 문구, 모르는 코드는 일반 문구', () => {
    const rate = new ApiError('http', 429, 'RATE_LIMITED');
    expect(errorMessage(rate, { RATE_LIMITED: '화면 문구' })).toBe('화면 문구');
    expect(errorMessage(rate)).toBe(strings.errors.RATE_LIMITED);
    expect(errorMessage(new ApiError('http', 418, 'TEAPOT'))).toBe(strings.errors.UNKNOWN);
    expect(errorMessage(new ApiError('network', null, 'NETWORK'))).toBe(strings.errors.NETWORK);
    expect(errorMessage(new Error('boom'))).toBe(strings.errors.UNKNOWN);
  });
  it('errorCode', () => {
    expect(errorCode(new ApiError('http', 404, 'NOT_FOUND'))).toBe('NOT_FOUND');
    expect(errorCode('x')).toBe('UNKNOWN');
  });
});
