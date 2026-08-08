// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://notnikko.github.io',
  // base is only set when building in GitHub Actions — local dev uses root
  base: process.env.GITHUB_ACTIONS ? '/recipe-book' : undefined,
  vite: {
    plugins: [tailwindcss()]
  }
});
