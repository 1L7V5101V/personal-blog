// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tegaki from 'tegaki/astro/integration';

// https://astro.config.mjs
export default defineConfig({
  // 默认仍然构建期出静态页；读 D1 的那几页各自 export const prerender = false。
  // 适配器把按需渲染的入口产成 dist/server/、静态资产产成 dist/client/，
  // 部署契约（main / assets / d1 绑定）由它写进 dist/server/wrangler.json —— 
  // 所以 wrangler.jsonc 里不要自己写 main。
  // imageService 不给运行期绑定：这个站没有一处用 <Image>，图片全走 public/img 的原文件。
  adapter: cloudflare({ imageService: 'passthrough' }),
  // 用不上会话存储：这条是为了不让适配器顺手在账户里建一个 KV 命名空间
  session: false,
  // ⚠ 阈值给 0：Astro 会把小于 vite 内联阈值的 client chunk 直接写进 HTML 的
  //   <script type="module"> 里。文章页挂着 script-src 'self' 的内容安全政策（正文
  //   HTML 是站上写作时由浏览器排好交上来的，得防它夹带脚本），那些内联脚本会被
  //   政策挡掉 —— 表现是心电图进度条在文章页不动。全部走外链文件就没这个问题。
  //   （字体本来就有 80KB+，不受这条影响。）
  vite: { build: { assetsInlineLimit: 0 } },
  // ⚠ 这里没有 markdown 段是故意的：站上正文的排版只走 src/lib/render.ts 那一份
  //   （浏览器排版 → 存进 D1 → 文章页直接吐存好的 HTML），构建期不再排任何 Markdown。
  //   要改排版就改 src/lib/render.ts，然后跑 node scripts/check-render.mjs 对照 Astro 那条管线。
  //
  // tegaki = 手写标题（src/components/Handwritten.astro）。这个 integration 只做一件事：
  // 让 Vite 在**服务端**也能解析字体 bundle 里的 ttf URL —— 不然 SSR 出来的
  // fallback 字体宽度和浏览器里的不一致，文字会跳一下。见 tegaki.ink 的 Astro 指南。
  integrations: [tegaki()],
});
