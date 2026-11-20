/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 서버 주소(끝에 / 없이). 이름은 .env.example */
  readonly VITE_API_URL?: string;
  /** 숨길 구역(쉼표로 나눈 이름, 예 users,push). 이름은 .env.example */
  readonly VITE_HIDDEN_SECTIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
