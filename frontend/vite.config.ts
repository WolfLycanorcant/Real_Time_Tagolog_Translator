import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // https: true,            // Disabled due to SSL compatibility issues
    host: '0.0.0.0',           // Allow external connections
    port: 5173,                // Standard Vite port
    strictPort: true,          // Fail if port unavailable
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'wolf.ngrok.dev',        // Your specific ngrok domain
      '.ngrok.dev',            // All ngrok.dev subdomains
      '.ngrok.io',             // All ngrok.io subdomains
      '.ngrok-free.app',       // All ngrok-free.app subdomains
      '.trycloudflare.com',    // Cloudflare tunnels
      '.loca.lt',              // Localtunnel
      '.serveo.net'            // Serveo tunnels
    ],
    cors: {
      origin: true,            // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    hmr: false,  // Disable HMR to prevent SSL errors when accessed through HTTPS tunnels
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add ngrok skip header to proxied requests
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true')
          })
        }
      }
    }
  },
  optimizeDeps: {
    include: ['lucide-react']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
})