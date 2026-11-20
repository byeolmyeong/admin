import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 화면 전체를 그리며 한 글자씩 적는 테스트(첫 로그인 비밀번호 · 푸시 발송 등)는 기본 5초에 걸린다.
    testTimeout: 15_000,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    env: { VITE_API_URL: 'http://api.test' },
  },
});
