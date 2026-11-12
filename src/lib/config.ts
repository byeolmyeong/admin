/** 서버 주소를 다듬는다: 앞뒤 공백과 끝의 / 를 뗀다. 비었거나 http(s) 주소가 아니면 null. */
export const normalizeApiUrl = (raw: string | undefined): string | null => {
  const url = (raw ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/.+/.test(url) ? url : null;
};

/** 환경 변수 VITE_API_URL 의 서버 주소. 없으면 null. */
export const apiBaseUrl = (): string | null => normalizeApiUrl(import.meta.env.VITE_API_URL);
