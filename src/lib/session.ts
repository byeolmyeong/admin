/** 관리자 세션 토큰의 보관. sessionStorage 에만 둔다(탭을 닫으면 사라진다). */
export interface StoredSession {
  token: string;
  /** 세션이 끝나는 때(UTC 글자) */
  expiresAt: string;
}

const KEY = 'byeolmyeong-admin.session';

const isStored = (v: unknown): v is StoredSession =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as StoredSession).token === 'string' &&
  (v as StoredSession).token !== '' &&
  typeof (v as StoredSession).expiresAt === 'string' &&
  !Number.isNaN(Date.parse((v as StoredSession).expiresAt));

export const saveSession = (session: StoredSession): void => {
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  window.sessionStorage.removeItem(KEY);
};

/** 보관된 세션. 없거나, 모양이 틀리거나, 끝났으면 지우고 null. */
export const loadSession = (now: number = Date.now()): StoredSession | null => {
  const raw = window.sessionStorage.getItem(KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!isStored(parsed) || Date.parse(parsed.expiresAt) <= now) {
    clearSession();
    return null;
  }
  return { token: parsed.token, expiresAt: parsed.expiresAt };
};
