import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';

// public/ 의 파일 목록(빌드 때 dist 바로 아래로 그대로 복사된다)
const publicFiles = Object.keys(import.meta.glob('../../public/*'));

/** 북마크 · 탭 아이콘(앱 · 랜딩과 같은 별명 아이콘). 없으면 브라우저가 지구본을 보인다. */
describe('파비콘', () => {
  it('index.html 이 아이콘 · 홈 화면 아이콘을 가리킨다', () => {
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  it('가리키는 파일이 public 에 있다', () => {
    expect(publicFiles).toEqual(expect.arrayContaining(['../../public/favicon.ico', '../../public/apple-touch-icon.png']));
  });
});
