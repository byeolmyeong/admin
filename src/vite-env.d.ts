/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 서버 주소(끝에 / 없이). 이름은 .env.example */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
