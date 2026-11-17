import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const llamaTarget = env.VITE_LLAMA_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue(), tailwindcss(), vueDevTools()],
    server: {
      host: true,
      port: 5173,
      // Leitet API-Aufrufe an llama.cpp weiter (vermeidet CORS-Probleme im Dev-Modus)
      proxy: {
        '/v1': { target: llamaTarget, changeOrigin: true },
        '/health': { target: llamaTarget, changeOrigin: true },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
