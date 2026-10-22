# personal-blog 现状架构理解

**产出方式**：架构可视化 Plugin v0.1.0 → `explore` 路由 → `system-modeler`（现状建模）+ `c4model`（Structurizr DSL）+ `graphviz`（隐式运行时依赖）。
**范围**：仅当前状态。`main` @ d17030b，`D:\.Projects\personal-blog`。不含目标架构、风险评审、部署拓扑细节（那些分别归 `evolution-planner` / `risk-quality-reviewer` / `deployment-topology-analyzer`）。
**受众与用途**：需要在一屏内回答「这仓库分几层、每层放什么、网站一共有哪些页面、层与层之间靠什么连接」。

配套文件：
- `personal-blog.structurizr.dsl` — 模型真源，4 个视图（`l1-context` / `l2-containers` / `l3-build-components` / `l3-runtime-components`）
- `runtime-bus.dot` — 隐式运行时契约图（import 图里看不见的那一层）

---

## 1. 代码库层级（L2 → L4）

| 层 | 内容 | 真源 | 置信度 |
|---|---|---|---|
| L1 系统上下文 | 博客系统 ↔ 访客 / 作者 / Cloudflare 托管 / DNS / Email Routing / 离线深度图工具 | `wrangler.jsonc`、`Base.astro:12` | high（仓库内部分）|
| L2 容器 | **构建期**（Astro 7.3.5 + Vite）、**浏览器运行时**（vanilla JS）、**静态产物 `dist/`**、**文章源**、**资产 `public/`**、**会话存储 `sessionStorage['pt']`** | `package.json`、`astro.config.mjs`、`dist/`、`page-transition.ts:18` | high |
| L3 构建期组件 | 页面层 / 组合根 / 组件层 / 内容集合层 / 数据页层 / 样式层 / Markdown 管线 | 见下表 | high |
| L3 运行时组件 | `__fx` 总线 / 首页 journey / 阅读导引 / 心电图 / 页面过渡 / WebGL 流体 | `runtime-bus.dot` | high |
| L4 符号 | `src/` 共 21 个文件（7 页面模块 + 1 布局 + 2 组件 + 2 脚本 + 1 样式 + 1 数据 + 1 schema + 6 文章） | `find src -type f` | high |

L3 构建期的依赖收敛成一点：**`src/layouts/Base.astro` 是组合根**，被 7/7 页面模块 import（`grep` 全部命中），它自己再 import `global.css` 与 `EcgProgress.astro`，并在 `<script>` 里 import `lenis` 与 `../scripts/page-transition`。页面不再互相依赖，所以 import 图是一棵干净的星形。

`Handwritten.astro` 是唯一的按需组件：`blog/[slug].astro:18-19` 只在 frontmatter 写了 `handwritten` 时才 `await import()` 它。`fluid.js` 同理，只由 `index.astro:142` 动态引入。

## 2. 网站层级（URL 树，实测 12 个 HTML 路由）

```
/                                src/pages/index.astro                    横向 journey
/blog/                           src/pages/blog/index.astro               文章列表
/blog/<slug>/                    src/pages/blog/[slug].astro              ×6 详情（getStaticPaths）
/columns/                        src/pages/columns/index.astro            栏目注册表
/columns/six-companies-ranking/  src/pages/columns/six-companies-ranking  数据页
/about/                          src/pages/about.astro
/404                             src/pages/404.astro    ← wrangler.jsonc: not_found_handling="404-page"
```

内容层级只有两级，且**不是同一套机制**：

- 文章 = content collection（`src/content/blog/*.md` + `content.config.ts` 的 zod schema 约束）
- 栏目 = 手工登记的 `.astro` 页（`columns/index.astro` 顶部有一份栏目注册表，列表行 `data-pt="col:slug"`），不走 collection

首页内部的**视觉层级**（横向 journey，7 个 `.slot`）：

```
hero(→/blog/) → 图片卡 ×2 → 海报卡 ×3（写 / 拆 / 100%）→ 列表面板 ×1（6 行）
＋ manifesto（宣言块，不是 .slot，直接写在画布上）
```

图片卡数量由 `featured = posts.slice(0, 2)` 决定（`index.astro:8`，按 `date` 倒序）。按当前数据，两张分别是 `handwriting-stroke-order`（2026-10-03，frontmatter 无 `cover`）和 `why-blog-again`（2026-10-02，`/img/p1.jpg`）；`p2/p3/p4` 三组封面+深度图挂在更靠后的文章上。

`data-pt` 是页面过渡的**锚点命名空间**（`hero` / `card:` / `poster:` / `row:` / `col:`）——同一 slug 会同时出现在图卡和列表行里，所以前缀必须不同，否则返回动画会找错卡。

## 3. 跨层连接（真正需要知道的两件事）

1. **构建期到运行时是断开的**：Astro 编译出静态 HTML，运行时那 6 个组件全靠浏览器里的 DOM 查询和全局变量组织起来。`dist/` 里没有任何服务端渲染单元。
2. **运行时的层级不在 import 图上，挂在 window 全局名**：`__fx`（回调数组，Base 每帧遍历）、`__lenis`（滚动控制器，所有程序化滚动必须走它）、`__ecgStrip`（首页每帧现查 + 补建）、`__pt` 与 `pt-back` 事件、`sessionStorage['pt']`。两处「谁先跑不保证」的顺序问题靠兜底解决，`runtime-bus.dot` 里用红色虚线单独标出。

## 4. 证据索引

| 论断 | 证据 | 置信度 |
|---|---|---|
| Base 是唯一组合根 | 7 处 `import Base from '../layouts/Base.astro'`；`Base.astro:2-3,52-54` | high |
| 全站一个 rAF | `Base.astro:85-92` 驱动 `window.__fx`；`page-transition.ts:9` 注释与实现都声明不进该循环 | high |
| 12 个路由 | `find dist -name '*.html'` 实测 | high |
| 6 篇文章 / 4 组封面+深度图 | `src/content/blog/`、`public/img/`、各篇 frontmatter | high |
| 托管走 Workers 静态资产 | `wrangler.jsonc:2-8`（`assets.directory=./dist`, `not_found_handling`） | high |
| 顶栏邮箱是 `hi@il7510n.dpdns.org` | `Base.astro:12` | high |
| Cloudflare 侧 DNS / Email Routing 规则 | 只有代码里的地址，规则在控制台 | **inferred** |
| 离线深度图工具参与构建 | `tools/depth/` 无 import、无 npm script，产物是人工放进 `public/img` | **inferred**（无调用关系） |

## 5. 冲突与待验证

- **文档与配置冲突**：`AGENTS.md` 写「部署 Cloudflare Pages」，但仓库里的部署配置是 Workers 静态资产 + `npx wrangler deploy`（`wrangler.jsonc:2`）。仓库内没有 `.github/workflows/`、`_headers`、`_redirects`、`functions/`、`wrangler.toml`，因此**没有证据支持 Pages 这条路径**。模型按配置画，文档那句需要你确认以哪个为准。
- **线上状态未知**：没接 Cloudflare API，本模型不含当前部署版本、环境变量、域名解析实况。需要的话走 `deployment-topology-analyzer`。
- **首页第 1 张图卡的封面**：按日期排序它落在 `handwriting-stroke-order`，而这篇没有 `cover`，即该图卡只渲染空的 `.imgbox`。结构上确认，视觉表现未跑起来核对。

## 6. 怎么看图 / 下一步

DSL 是**真源**，渲染预览是派生产物。用 Qoder 的 Structurizr DSL 查看器打开 `personal-blog.structurizr.dsl` 即可（文件匹配 `**/*.structurizr.dsl`，首个声明是 `workspace`）；`runtime-bus.dot` 需要 Graphviz，本机 `dot` 不在 PATH 上，渲染命令：`dot -Tsvg runtime-bus.dot -o runtime-bus.svg`。

**校验状态**：DSL 过了结构性自检（27 元素 / 32 关系 / 4 视图，无未声明引用、括号配平）；官方 `@structurizr/dsl` 解析器在当前 npm registry 取不到（4 个候选包名全 404），所以**没有跑过真正的语法解析**。自检放行的三条 advisory 是 `collection/pipeline -> articles` 与 `transition -> session`，属于 C4 里合法的「组件连其他容器的数据存储」，不是错误。要接进 CI 的话，先解决解析器可得性，再按 `architecture-health` 建立模型与代码的同步检查。

后续问题路由：卡片之间怎么跳、状态怎么流动 → `flow-visualizer`；改某个文件影响哪些页面 → `dependency-impact-analyzer`；这套东西实际怎么上线和运维 → `deployment-topology-analyzer`；判断这份模型是否随代码过期 → `architecture-health`。
