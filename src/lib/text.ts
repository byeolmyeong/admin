/** 서버와 같은 방식으로 글자 수를 센다: 유니코드 코드 포인트(이모지 한 개도 1). */
export const codePointLength = (text: string): number => [...text].length;

/** UTF-8 로 바꿨을 때의 바이트 수(비밀번호의 72바이트 한도). */
export const utf8ByteLength = (text: string): number => new TextEncoder().encode(text).length;

/** 목록의 한 줄 요약: 줄바꿈·이어진 공백을 한 칸으로 줄이고 max 코드 포인트에서 자른다. */
export const oneLine = (text: string, max: number): string => {
  const points = [...text.replace(/\s+/g, ' ').trim()];
  return points.length <= max ? points.join('') : `${points.slice(0, max).join('')}…`;
};

const seoulParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * 서버의 UTC 시각 글자를 한국 시각 `2026.11.20 08:01:12` 로(어드민 결정 003 의 7 — "오늘 · 어제 · N일 전" 은 쓰지 않는다).
 * 읽을 수 없으면 받은 그대로.
 */
export const formatKst = (iso: string): string => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const part = Object.fromEntries(seoulParts.formatToParts(time).map((p) => [p.type, p.value]));
  return `${part.year}.${part.month}.${part.day} ${part.hour}:${part.minute}:${part.second}`;
};

/** 답장 이메일의 mailto 주소. 주소 자리에 제목·본문을 끼워 넣지 못하게 인코딩한다. */
export const mailtoHref = (email: string): string =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`;
