import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    server: {
        mimeTypes: {
          'text/javascript': ['js', 'jsx']
        }
      },
    plugins: [react()],
})
