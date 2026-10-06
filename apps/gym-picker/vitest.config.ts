import { defineConfig } from 'vitest/config';

// Séparé de vite.config.ts : les tests ne couvrent que des fonctions pures et
// n'ont pas besoin du plugin Cloudflare (ni de démarrer workerd).
export default defineConfig({
  test: {
    include: ['{src,worker,shared}/**/*.test.ts'],
  },
});
