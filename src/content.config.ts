import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // 这篇文章属于哪个栏目（值是 src/data/columns.ts 里的 slug）。必填：没有栏目的文章进不去。
    column: z.string(),
    // 最后更新时间。不填就按 date 算（见 src/lib/posts.ts 的 updatedAt）。
    // 站上编辑器以后改的就是这个字段。
    updated: z.coerce.date().optional(),
    cover: z.string().optional(),
    // 手写标题（可选）：写了就渲染 Handwritten.astro，逐笔写出来。
    // 必须在这里声明，否则会被静默丢掉（下面那个 z.object 不开passthrough）。
    handwritten: z.string().optional(),
    // 灰度深度图（亮 = 近）：有它首页图片卡才会挂 WebGL 视差画布，没有就退回普通 <img>。
    // 用 tools/depth/mk.py 离线生成（Depth Anything V2）。注意：schema 是普通 z.object，
    // 没在这里声明的 frontmatter 字段会被静默丢掉 —— 加了新字段一定回来补一行。
    depth: z.string().optional(),
  }),
});

export const collections = { blog };
