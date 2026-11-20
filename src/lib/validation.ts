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

export type PasswordProblem = 'TOO_SHORT' | 'TOO_LONG' | 'NO_MIX';

/** 영문과 숫자를 함께 썼는지(결정 003 의 2 — "10자 이상 · 영문 · 숫자 조합") */
export const hasLetterAndDigit = (password: string): boolean => /[A-Za-z]/.test(password) && /[0-9]/.test(password);

/** 앞뒤 공백을 떼지 않고 본다. 서버 규칙(10자 · 72바이트)에 화면 규칙(영문 · 숫자 조합)을 더한다. */
export const passwordProblem = (password: string): PasswordProblem | null => {
  if (codePointLength(password) < PASSWORD_MIN) return 'TOO_SHORT';
  if (utf8ByteLength(password) > PASSWORD_MAX_BYTES) return 'TOO_LONG';
  if (!hasLetterAndDigit(password)) return 'NO_MIX';
  return null;
};

/** 관리자 아이디(보드 D16 — 영문 소문자 · 숫자 4~20자). 서버 규칙(3~32자)보다 좁다. */
export const ADMIN_LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;

/** 계약 "감사 기록" 의 from · to: 한국 시간의 날짜 `YYYY-MM-DD`, 달력에 있는 날. */
export const isValidDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** 계약 "앱 설정" 과 같은 검사. */
export const STORE_URL_MAX = 500;
export const APP_MESSAGE_MAX = 200;

/** 버전: 점으로 나눈 1~3개의 0 이상 정수, 자리마다 숫자 9개까지. 앞뒤 공백도 틀린 값이다. */
export const isValidVersion = (version: string): boolean => /^[0-9]{1,9}(\.[0-9]{1,9}){0,2}$/.test(version);

/** 이미 isValidVersion 을 거친 두 값을 숫자로 견준다. 빠진 자리는 0 (`1.2` = `1.2.0`). a 가 높으면 양수. */
export const compareVersions = (a: string, b: string): number => {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
  for (let i = 0; i < 3; i += 1) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/** 스토어 주소: `https://` 로 시작하고 호스트가 있고 공백이 없는 500자 이하. 앞뒤 공백을 떼지 않는다. */
export const isValidStoreUrl = (url: string): boolean =>
  codePointLength(url) <= STORE_URL_MAX && /^https:\/\/[^\s/?#]+\S*$/.test(url);
