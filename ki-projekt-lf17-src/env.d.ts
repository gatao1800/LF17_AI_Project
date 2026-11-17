/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LLAMA_API_URL?: string
  readonly VITE_LLAMA_PROXY_TARGET?: string
  readonly VITE_PLANTUML_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
