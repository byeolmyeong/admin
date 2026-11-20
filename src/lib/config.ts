/** 서버 주소를 다듬는다: 앞뒤 공백과 끝의 / 를 뗀다. 비었거나 http(s) 주소가 아니면 null. */
export const normalizeApiUrl = (raw: string | undefined): string | null => {
  const url = (raw ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/.+/.test(url) ? url : null;
};

/** 환경 변수 VITE_API_URL 의 서버 주소. 없으면 null. */
export const apiBaseUrl = (): string | null => normalizeApiUrl(import.meta.env.VITE_API_URL);

/**
 * 숨길 구역의 주소들. 쉼표로 나눈 구역 이름(예 "users,push" → ["/users", "/push"]).
 * 운영 서버에 아직 경로가 없는 구역을 메뉴 · 라우트에서 빼려고 쓴다(서버 S⑪ · S10-5 전).
 */
export const parseHiddenSections = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase().replace(/^\/+/, ''))
    .filter((name) => /^[a-z0-9-]+$/.test(name))
    .map((name) => `/${name}`);

/** 환경 변수 VITE_HIDDEN_SECTIONS 의 숨길 구역 주소들 */
export const hiddenSections = (): string[] => parseHiddenSections(import.meta.env.VITE_HIDDEN_SECTIONS);
