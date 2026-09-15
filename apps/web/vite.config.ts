import {env} from '@library/config'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  server: {
    proxy: {
      '/api/trpc': {
        target: `http://localhost:${env.PORT}`,
        rewrite: (path) => path.replace(/^\/api\/trpc/, ''),
      },
    },
  },
})
