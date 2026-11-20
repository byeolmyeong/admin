import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// 화면 전체를 그리는 테스트는 기계가 바쁠 때 findBy* 기본 1초를 넘긴다(전체 실행에서만 가끔 실패).
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
