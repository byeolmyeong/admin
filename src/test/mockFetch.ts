import { vi } from 'vitest';

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  headers: Headers;
  init: RequestInit;
}

export interface MockReply {
  status: number;
  body?: unknown;
  /** JSON 이 아닌 본문(예: CORS 거절의 글자 본문)을 흉내 낼 때 */
  text?: string;
}

export type Route = MockReply | ((req: MockRequest) => MockReply | Promise<MockReply>);

/**
 * 전역 fetch 를 흉내 낸다. routes 의 키는 "GET /admin/stats" 꼴이다.
 * 돌려준 routes 를 테스트 중에 바꾸면 다음 호출부터 바뀐 답이 나간다.
 */
export function mockFetch(routes: Record<string, Route>) {
  const calls: MockRequest[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const req: MockRequest = {
      method,
      path: url.pathname,
      query: url.searchParams,
      body: typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      headers: new Headers(init.headers),
      init,
    };
    calls.push(req);
    const route = routes[`${method} ${url.pathname}`];
    if (!route) throw new TypeError(`mockFetch: 준비하지 않은 호출 ${method} ${url.pathname}`);
    const reply = typeof route === 'function' ? await route(req) : route;
    if (reply.text !== undefined) return new Response(reply.text, { status: reply.status });
    if (reply.body === undefined) return new Response(null, { status: reply.status });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, routes, fn };
}

export const callsTo = (calls: MockRequest[], key: string) =>
  calls.filter((c) => `${c.method} ${c.path}` === key);
