import { describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test/mockFetch';
import { ApiError, createClient } from './client';
import { isAdmin } from './guards';
import { admin } from '../../test/fixtures';

const make = (token: string | null = 'tok-test') => {
  const onUnauthorized = vi.fn();
  const client = createClient({ baseUrl: 'http://api.test', getToken: () => token, onUnauthorized });
  return { client, onUnauthorized };
};

const caught = async (p: Promise<unknown>): Promise<ApiError> => {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error('오류가 나야 한다');
};

describe('createClient', () => {
  it('Bearer 토큰을 붙이고, 본문이 없으면 Content-Type 을 붙이지 않고, credentials 를 주지 않는다', async () => {
    const { calls } = mockFetch({ 'GET /admin/me': { status: 200, body: admin } });
    const { client } = make();
    await expect(client.request('GET', '/admin/me', { guard: isAdmin })).resolves.toEqual(admin);
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer tok-test');
    expect(calls[0]?.headers.get('Content-Type')).toBeNull();
    expect(calls[0]?.init.credentials).toBeUndefined();
  });

  it('본문은 JSON 으로 보낸다', async () => {
    const { calls } = mockFetch({ 'PUT /admin/me/password': { status: 204 } });
    const { client } = make();
    await expect(
      client.request('PUT', '/admin/me/password', { body: { currentPassword: 'a', newPassword: 'b' } }),
    ).resolves.toBeUndefined();
    expect(calls[0]?.headers.get('Content-Type')).toBe('application/json');
    expect(calls[0]?.body).toEqual({ currentPassword: 'a', newPassword: 'b' });
  });

  it('auth: false 면 토큰을 붙이지 않고, 401 이어도 onUnauthorized 를 부르지 않는다', async () => {
    const { calls } = mockFetch({ 'POST /admin/auth/login': { status: 401, body: { error: 'INVALID_CREDENTIALS' } } });
    const { client, onUnauthorized } = make();
    const e = await caught(client.request('POST', '/admin/auth/login', { body: {}, auth: false }));
    expect(e).toMatchObject({ kind: 'http', status: 401, code: 'INVALID_CREDENTIALS' });
    expect(calls[0]?.headers.get('Authorization')).toBeNull();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('세션이 필요한 호출의 401 은 onUnauthorized 를 부른다', async () => {
    mockFetch({ 'GET /admin/me': { status: 401, body: { error: 'UNAUTHORIZED' } } });
    const { client, onUnauthorized } = make();
    const e = await caught(client.request('GET', '/admin/me', { guard: isAdmin }));
    expect(e).toMatchObject({ kind: 'http', status: 401, code: 'UNAUTHORIZED' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('토큰이 없으면 서버를 부르지 않고 UNAUTHORIZED', async () => {
    const { fn } = mockFetch({});
    const { client, onUnauthorized } = make(null);
    const e = await caught(client.request('GET', '/admin/me', { guard: isAdmin }));
    expect(e.code).toBe('UNAUTHORIZED');
    expect(fn).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('오류 본문의 코드를 읽는다', async () => {
    mockFetch({ 'GET /x': { status: 409, body: { error: 'LOGIN_ID_TAKEN' } } });
    const e = await caught(make().client.request('GET', '/x'));
    expect(e).toMatchObject({ kind: 'http', status: 409, code: 'LOGIN_ID_TAKEN' });
  });

  it('오류 본문이 JSON 이 아니면(허용하지 않은 출처의 403 등) 코드는 UNKNOWN', async () => {
    mockFetch({ 'GET /x': { status: 403, text: 'Invalid CORS request' } });
    const e = await caught(make().client.request('GET', '/x'));
    expect(e).toMatchObject({ kind: 'http', status: 403, code: 'UNKNOWN' });
  });

  it('연결 실패는 NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const e = await caught(make().client.request('GET', '/x'));
    expect(e).toMatchObject({ kind: 'network', status: null, code: 'NETWORK' });
  });

  it('모양이 틀린 200 응답은 INVALID_RESPONSE 이고 값을 넘기지 않는다', async () => {
    mockFetch({
      'GET /admin/me': { status: 200, body: { id: 1 } },
      'GET /text': { status: 200, text: '<html>' },
    });
    const { client } = make();
    expect(await caught(client.request('GET', '/admin/me', { guard: isAdmin }))).toMatchObject({
      kind: 'invalid_response',
      code: 'INVALID_RESPONSE',
    });
    expect(await caught(client.request('GET', '/text', { guard: isAdmin }))).toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('오류 메시지에 토큰이나 본문을 담지 않는다', async () => {
    mockFetch({ 'POST /x': { status: 400, body: { error: 'INVALID_REQUEST' } } });
    const e = await caught(make().client.request('POST', '/x', { body: { password: 'secret-pw-123' } }));
    expect(e.message).not.toContain('secret-pw-123');
    expect(e.message).not.toContain('tok-test');
  });
});
