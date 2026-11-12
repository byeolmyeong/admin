import { codePointLength, utf8ByteLength } from './text';

/** 계약 "관리자 관리"·"비밀번호 규칙" 과 같은 검사. 서버가 최종 판정이고, 여기는 보내기 전에 알려 주는 용도다. */
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const NAME_MAX = 40;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX_BYTES = 72;

export const normalizeLoginId = (raw: string): string => raw.trim().toLowerCase();

/** 이미 normalizeLoginId 를 거친 값을 본다. */
export const isValidLoginId = (loginId: string): boolean => LOGIN_ID_PATTERN.test(loginId);

export const isValidName = (raw: string): boolean => {
  const length = codePointLength(raw.trim());
  return length >= 1 && length <= NAME_MAX;
};

export type PasswordProblem = 'TOO_SHORT' | 'TOO_LONG';

/** 앞뒤 공백을 떼지 않고 본다. */
export const passwordProblem = (password: string): PasswordProblem | null => {
  if (codePointLength(password) < PASSWORD_MIN) return 'TOO_SHORT';
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) return 'TOO_LONG';
  return null;
};

/** 계약 "감사 기록" 의 from · to: 한국 시간의 날짜 `YYYY-MM-DD`, 달력에 있는 날. */
export const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
