
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no modo (development/production)
  // Cast (process as any) evita erros de tipagem em ambientes onde @types/node não está perfeito
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Monkey Tips | Sports Intelligence',
          short_name: 'MonkeyTips',
          description: 'High-end sports intelligence terminal.',
          theme_color: '#09090B',
          background_color: '#09090B',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    server: {
      port: 3000,
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
          output: {
              manualChunks: {
                  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                  'vendor-charts': ['recharts'],
                  'vendor-ai': ['@google/genai']
              }
          }
      }
    },
    define: {
      // Garante que process.env.API_KEY esteja disponível no código do cliente
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Timestamp de build para cache busting
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    }
  }
})