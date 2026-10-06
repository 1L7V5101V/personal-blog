// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import tegaki from 'tegaki/astro/integration';

// https://astro.build/config
export default defineConfig({
  markdown: {
    // 物理/技术类文章靠 $...$ 和 $$...$$ 写公式，没这两个插件会渲染成一堆字面的 $
    // （文档里有 1300 多处行内公式）。katex 的 CSS 在 [slug].astro 里按页引入。
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: { theme: 'github-light' },
  },
  // 手写标题（src/components/Handwritten.astro）。这个 integration 只做一件事：
  // 让 Vite 在**服务端**也能解析字体 bundle 里的 ttf URL —— 不然 SSR 出来的
  // fallback 字体宽度和浏览器里的不一致，文字会跳一下。见 tegaki.ink 的 Astro 指南。
  //
  // mdx = 文章正文里能直接放组件。「六家综合排行」那张 11 列宽表的数据留在
  // src/data/six-ranking.ts（带构建期校验），文章只管排版 →
  // src/content/blog/six-companies-ranking.mdx
  integrations: [mdx(), tegaki()],
});
