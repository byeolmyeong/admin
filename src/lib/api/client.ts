import type { Guard } from './guards';

export type ApiErrorKind = 'http' | 'network' | 'invalid_response';

/**
 * 서버 호출의 실패. message 에는 종류·상태·코드만 담는다(토큰·본문·입력값을 담지 않는다).
 * code: 서버의 `{ "error": "<코드>" }`, 읽지 못하면 UNKNOWN. 연결 실패는 NETWORK, 모양이 틀린 응답은 INVALID_RESPONSE.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string;

  constructor(kind: ApiErrorKind, status: number | null, code: string) {
    super(`api ${kind} ${status ?? '-'} ${code}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export interface ClientOptions {
  /** 서버 주소. 끝의 / 는 없어야 한다. */
  baseUrl: string;
  getToken: () => string | null;
  /** 세션이 필요한 호출이 401 을 받았을 때(토큰을 버리고 로그인 화면으로 보낸다). */
  onUnauthorized: () => void;
}

export interface RequestOptions<T> {
  body?: unknown;
  /** 200·201 의 본문 검사. 없으면 본문을 읽지 않는다(204). */
  guard?: Guard<T>;
  /** false 는 로그인처럼 토큰 없이 부르는 경로다. */
  auth?: boolean;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Client {
  request<T = undefined>(method: Method, path: string, options?: RequestOptions<T>): Promise<T>;
}

const readErrorCode = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string') {
      return (body as { error: string }).error;
    }
  } catch {
    // JSON 이 아닌 오류 본문(허용하지 않은 출처의 403 등)
  }
  return 'UNKNOWN';
};

export const createClient = ({ baseUrl, getToken, onUnauthorized }: ClientOptions): Client => ({
  async request<T>(method: Method, path: string, options: RequestOptions<T> = {}): Promise<T> {
    const { body, guard, auth = true } = options;
    const headers: Record<string, string> = {};
    if (auth) {
      const token = getToken();
      if (token === null) {
        onUnauthorized();
        throw new ApiError('http', 401, 'UNAUTHORIZED');
      }
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      // 쿠키를 쓰지 않는다: credentials 를 주지 않는다(계약 "브라우저 출처").
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('network', null, 'NETWORK');
    }

    if (!response.ok) {
      const code = await readErrorCode(response);
      if (response.status === 401 && auth) onUnauthorized();
      throw new ApiError('http', response.status, code);
    }
    if (!guard) return undefined as T;

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new ApiError('invalid_response', response.status, 'INVALID_RESPONSE');
    }
    if (!guard(data)) throw new ApiError('invalid_response', response.status, 'INVALID_RESPONSE');
    return data;
  },
});
