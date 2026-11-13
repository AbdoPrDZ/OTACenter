import { readFileSync } from 'node:fs';

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

/**
 * `page.mdx?frontmatter` → a tiny module exporting only the page's frontmatter.
 * The docs sidebar needs every page's title/order up front, but importing the
 * compiled pages for that would put all of them in the docs entry chunk; this
 * keeps the page bodies in their own lazily loaded chunks. Frontmatter is flat
 * `key: value` lines (strings and integers), which is all the docs use.
 */
function mdxFrontmatterOnly() {
  return {
    name: 'mdx-frontmatter-only',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith('.mdx?frontmatter')) return null;
      return this.resolve(source.replace(/\?frontmatter$/, ''), importer, { skipSelf: true }).then(
        (resolved) => (resolved ? `${resolved.id}?frontmatter` : null),
      );
    },
    load(id) {
      if (!id.endsWith('.mdx?frontmatter')) return null;
      const file = id.replace(/\?frontmatter$/, '');
      this.addWatchFile(file);
      const block = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const data = {};
      for (const line of block ? block[1].split(/\r?\n/) : []) {
        const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
        if (!match) continue;
        const raw = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
        data[match[1]] = /^-?\d+$/.test(raw) ? Number(raw) : raw;
      }
      return `export default ${JSON.stringify(data)};`;
    },
  };
}

export default defineConfig({
  plugins: [
    mdxFrontmatterOnly(),
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
