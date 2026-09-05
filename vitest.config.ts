import { defineConfig } from 'vitest/config';

// Component tests only. `tsc` (the build) excludes `*.test.*` so nothing here
// ever lands in `dist/`; vitest compiles the JSX itself via esbuild.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    // Source files import siblings with TypeScript's `.js` suffix convention
    // (`../cn.js` is really `cn.ts`, `./badge.js` is `badge.jsx`) so that the
    // emitted `dist/` imports are correct without a bundler. tsc understands
    // that rewrite; Vite only applies it when the *importer* is TypeScript,
    // and most of `src/ui` is `.jsx`. Stripping the suffix on relative imports
    // lets Vite resolve through its normal extension list instead.
    alias: [{ find: /^(\.{1,2}\/.+)\.js$/, replacement: '$1' }],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
});
