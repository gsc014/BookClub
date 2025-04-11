import { defineConfig } from 'vite';

// export default defineConfig({
//   test: {
//     globals: true,
//     environment: 'jsdom',
//   },
// });
export default defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts', // if you have one
      coverage: {
        reporter: ['text', 'html', 'json-summary'],
        exclude: ['node_modules/', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  });
  