import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';

export default defineConfig({
  plugins: [
    // MDX must run before the React/Laravel transforms (it emits JSX/ESM).
    mdx({
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'frontmatter' }],
      ],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        [
          rehypePrettyCode,
          {
            // Dual themes: Shiki swaps on the `.dark` class (see app.css).
            theme: { light: 'github-light', dark: 'github-dark' },
            keepBackground: false,
            defaultLang: 'plaintext',
          },
        ],
      ],
      providerImportSource: '@mdx-js/react',
    }),
    laravel({
      input: [
        'resources/js/apps/home/index.tsx',
        'resources/js/apps/store/index.tsx',
        'resources/js/apps/docs/index.tsx',
        'resources/js/apps/auth/index.tsx',
        'resources/js/apps/dashboard/index.tsx',
      ],
      refresh: true,
      fonts: [
        bunny('Instrument Sans', {
          weights: [400, 500, 600],
        }),
      ],
    }),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: ['**/storage/framework/views/**'],
    },
  },
});
