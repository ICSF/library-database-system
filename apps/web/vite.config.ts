import react from '@vitejs/plugin-react'
import {defineConfig, loadEnv} from 'vite'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '../..', '');
  const port = env.PORT ?? '4000';

  return {
    plugins: [react()], envDir: '../..', server: {
      proxy: {
        '/api': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})