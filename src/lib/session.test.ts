import { describe, expect, it } from 'vitest';
import { clearSession, loadSession, saveSession } from './session';

const now = Date.parse('2026-11-12T00:00:00Z');

describe('session', () => {
  it('저장한 토큰을 sessionStorage 에서 다시 읽는다(localStorage 는 쓰지 않는다)', () => {
    saveSession({ token: 't1', expiresAt: '2026-11-12T12:00:00Z' });
    expect(loadSession(now)).toEqual({ token: 't1', expiresAt: '2026-11-12T12:00:00Z' });
    // eslint-disable-next-line no-restricted-properties -- 쓰지 않았다는 것을 확인하는 자리다
    expect(window.localStorage.length).toBe(0);
  });
  it('expiresAt 이 지났으면 지우고 null', () => {
    saveSession({ token: 't1', expiresAt: '2026-11-11T23:59:59Z' });
    expect(loadSession(now)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });
  it('모양이 틀린 값은 지우고 null', () => {
    window.sessionStorage.setItem('byeolmyeong-admin.session', '{"token":1}');
    expect(loadSession(now)).toBeNull();
    window.sessionStorage.setItem('byeolmyeong-admin.session', 'not json');
    expect(loadSession(now)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });
  it('clearSession 은 지운다', () => {
    saveSession({ token: 't1', expiresAt: '2026-11-12T12:00:00Z' });
    clearSession();
    expect(loadSession(now)).toBeNull();
  });
});
