// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
  markdown: {
    // 物理/技术类文章靠 $...$ 和 $$...$$ 写公式，没这两个插件会渲染成一堆字面的 $
    // （文档里有 1300 多处行内公式）。katex 的 CSS 在 [slug].astro 里按页引入。
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: { theme: 'github-light' },
  },
});
