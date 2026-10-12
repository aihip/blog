import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({ site: 'https://blog.pheth.com', output: 'static', trailingSlash: 'always', integrations: [sitemap()] });
