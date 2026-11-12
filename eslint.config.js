import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // 토큰 · 비밀번호 · 문의 글 · 이메일이 로그로 새지 않게 console 을 통째로 막는다.
      'no-console': 'error',
      // 세션 토큰은 sessionStorage 에만 둔다(CLAUDE.md).
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'localStorage 에는 아무것도 두지 않는다.' }],
      'no-restricted-properties': ['error', { object: 'window', property: 'localStorage', message: 'localStorage 에는 아무것도 두지 않는다.' }],
    },
  },
);
