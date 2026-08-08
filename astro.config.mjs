// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://notnikko.github.io',
  // base is only set when building in GitHub Actions — local dev uses root
  // Trailing slash is required — BASE_URL must end with / for path concatenation to work
  base: process.env.GITHUB_ACTIONS ? '/recipe-book/' : undefined,
  vite: {
    plugins: [tailwindcss()]
  }
});
