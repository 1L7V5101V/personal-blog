import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tag: z.string().default('随笔'),
    cover: z.string().optional(),
    // 灰度深度图（亮 = 近）：有它首页图片卡才会挂 WebGL 视差画布，没有就退回普通 <img>。
    // 用 tools/depth/mk.py 离线生成（Depth Anything V2）。注意：schema 是普通 z.object，
    // 没在这里声明的 frontmatter 字段会被静默丢掉 —— 加了新字段一定回来补一行。
    depth: z.string().optional(),
  }),
});

export const collections = { blog };
