import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; 

// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'jsdom',
//   },
// });
export default defineConfig({
    plugins : [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts', // if you have one
      coverage: {
        reporter: ['text', 'html', 'json-summary'],
        exclude: ['node_modules/', 'src/main.tsx', 'src/vite-env.d.ts', '**/eslint.config.js', '**/vite.config.js', '**/vitest.config.ts', '**/main.jsx'],
      },
    },
  });
  