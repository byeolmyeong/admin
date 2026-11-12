import { strings } from '../content/strings';
import { ApiError } from './api/client';

/** 실패를 화면 문구로. 화면마다 다른 코드는 overrides 로 먼저 본다. 모르는 코드는 일반 문구다. */
export const errorMessage = (error: unknown, overrides: Readonly<Record<string, string>> = {}): string => {
  const code = error instanceof ApiError ? error.code : 'UNKNOWN';
  const common: Readonly<Record<string, string | undefined>> = strings.errors;
  return overrides[code] ?? common[code] ?? strings.errors.UNKNOWN;
};

export const errorCode = (error: unknown): string => (error instanceof ApiError ? error.code : 'UNKNOWN');
