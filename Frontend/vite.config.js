import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// Phone cameras only work on a secure origin: HTTPS, or localhost. To test scanning
// from a phone on the Wi-Fi, start the server with VITE_HTTPS=1 and open the https URL.
const useHttps = process.env.VITE_HTTPS === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    // Opening the dev server from a phone or another machine on the same Wi-Fi means
    // the API is on this machine, not on the phone. Proxying /api (and uploaded
    // images) keeps those requests same-origin, so no CORS setup is needed for a
    // phone test. Run the app with VITE_API_URL=/api for this to take effect.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
