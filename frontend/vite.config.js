import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Proxy all /api requests to Django backend
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    test: {
        globals: true,
        environment: 'jsdom', // Use 'node' if not testing UI
        setupFiles: './setupTests.ts'
    }
});

