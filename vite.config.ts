import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  // имя репозитория на GitHub: сайт будет на <username>.github.io/ton-wallet/
  base: '/ton-wallet/',
  plugins: [
    react(),
    // TON-библиотеки используют Buffer из Node.js, в браузере его нет: подставляем полифилл
    nodePolyfills({ include: ['buffer'], globals: { Buffer: true } }),
  ],
  server: { host: true },
})
