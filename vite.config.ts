import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clean = (v: string) => v.trim().replace(/^['"]|['"]$/g, '')
  const fdKey = clean(env['VITE_FOOTBALL_DATA_KEY'] ?? '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/fd': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fd/, '/v4'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              if (fdKey) proxyReq.setHeader('X-Auth-Token', fdKey)
            })
          },
        },
        '/tsdb': {
          target: 'https://www.thesportsdb.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tsdb/, '/api/v1/json/3'),
        },
        '/fl': {
          target: 'https://2.flashscore.ninja',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fl/, '/2/x/feed'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.setHeader('x-fsign', 'SW9D1eZo')
              proxyReq.setHeader('Referer', 'https://www.flashscore.com/')
            })
          },
        },
      },
    },
  }
})
