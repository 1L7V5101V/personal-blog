workspace "personal-blog" "Astro 静态博客的现状架构：构建期层级、浏览器运行时层级、网站页面层级。" {
  // 现状架构模型（system-modeler + c4model）。只画当前状态。
  // 每个节点/连线都能在仓库里指回文件；置信度标注在 description 里。
  // 配套阅读：architecture-understanding.md（含网站路由层级 + 证据索引）


  model {

    // ── L1 角色 ──────────────────────────────────────────────────
    reader = person "访客" "读博客的人。唯一运行时用户。"
    author = person "il7510n" "作者 + 唯一运维：写 .md、手写动效、自己配 Cloudflare。"

    // ── L2 系统边界 ──────────────────────────────────────────────
    blog = softwareSystem "personal-blog 博客" "黑场影像感静态博客；动效全 vanilla JS/CSS，无 React/Vue。" {

      // ---- 构建期容器（Astro 进程，产物是文件） ----
      build = container "Astro 构建期" "把 pages/content/data 编译成 dist/ 下的静态 HTML。Astro 7.3.5。" "Astro + Vite + Node 22" {
        routes = component "页面层 src/pages" "7 个 .astro 页面模块，是路由的唯一真源（文件即路由）。" "Astro"
        root = component "组合根 layouts/Base.astro" "被全部 7 个页面 import；负责 head/顶栏/顶棚/统一 rAF。" "Astro"
        compo = component "组件层 src/components" "EcgProgress.astro + Handwritten.astro（后者按需动态 import）。" "Astro"
        collection = component "内容集合层" "content.config.ts 用 zod 定义 schema；未声明的 frontmatter 字段被静默丢弃。" "astro:content"
        datalayer = component "数据页层 src/data" "six-ranking.ts 固定 11 元组；构建期断言频次之和=总频次。" "TypeScript"
        stylelayer = component "样式层 src/styles/global.css" "设计 token 唯一来源 + 全站样式。" "CSS"
        pipeline = component "Markdown 管线" "remark-gfm + remark-math + rehype-katex（legacy unified 路径）+ tegaki integration。" "unified"
      }

      // ---- 浏览器运行时容器（真实跑的那一层） ----
      browser = container "浏览器运行时" "vanilla JS，无框架。一个由 Base 统一驱动的 rAF 循环 + 一个 WAAPI 页面过渡。" "JavaScript / WebGL" {
        fx = component "统一 rAF 总线 window.__fx" "各页面把滚动联动回调 push 进数组，Base 每帧遍历调用。" "in-process"
        journey = component "首页横向 journey" "拉牌入场 / 弯牌切片 / 曲面屏形变 / 卡片倾斜跟随。" "index.astro <script>"
        readguide = component "文章页阅读导引" "刻度条 + 光球跟标题；每帧只读 scrollY，不碰 DOM 测量。" "[slug].astro <script>"
        ecg = component "心电图层 window.__ecgStrip" "fill（进度条）与 strip（走纸，一拍=一张卡）两种模式。" "EcgProgress.astro"
        transition = component "页面过渡" "纸片放大/缩回；走 WAAPI，不进 __fx。" "scripts/page-transition.ts"
        fluid = component "WebGL 流体" "首页背景；由 index.astro 动态 import。" "scripts/fluid.js"
      }

      dist = container "静态产物 dist/" "实测 12 个 HTML 路由 + fonts/img 资产；无服务端渲染单元。" "Static files"
      articles = container "文章源 src/content/blog" "6 篇 .md（含 12k px 长文 ubiquitous-language）。" "Markdown"
      media = container "资产 public/" "4 张封面 + 4 张配对深度图（p1–p4）+ 字体 + 噪点。" "webp/jpg/woff2"
      session = container "浏览器会话存储 sessionStorage['pt']" "跨导航传递：来源页、卡片 data-pt、版位 rect、滚动位置。" "Web Storage"
    }

    // ── L1 外部系统 ──────────────────────────────────────────────
    cfhost = softwareSystem "Cloudflare Workers 静态资产" "wrangler.jsonc: assets.directory=./dist, not_found_handling=404-page。"
    cfdns = softwareSystem "Cloudflare DNS" "解析 blog.il7510n.dpdns.org。配置在 Cloudflare 控制台，不在本仓库（inferred）。"
    email = softwareSystem "Cloudflare Email Routing" "顶栏邮箱 hi@il7510n.dpdns.org（Base.astro:12）；catch-all 转发规则在控制台，不在本仓库（inferred）。"
    inbox = softwareSystem "外部收件箱" "收信端。地址与转发关系无法从本仓库验证（inferred）。"
    depthtool = softwareSystem "离线深度图工具 tools/depth" "Depth Anything V2 生成 *-depth.webp，权重不进仓库；构建期不参与。"

    // ── L1 关系 ─────────────────────────────────────────────────
    reader -> cfhost "打开文章/首页" "HTTPS"
    author -> blog "写内容、改动效、手动 deploy"
    author -> email "在顶栏公开收信地址"
    email -> inbox "转发邮件" "SMTP" {
      tags "Inferred"
    }

    // ── 构建期 → 产物 → 托管 ────────────────────────────────────
    routes -> root "import（全部 7 个页面模块）" "in-process"
    routes -> compo "import / 动态 import" "in-process"
    routes -> collection "getCollection / render" "build-time API"
    routes -> datalayer "import COS, ROWS" "build-time"
    root -> stylelayer "import '../styles/global.css'" "build-time"
    root -> compo "import EcgProgress" "build-time"
    compo -> pipeline "tegaki integration 让 Vite 在服务端解析字体 bundle URL（astro.config.mjs:6,20 + Handwritten.astro:24-25）" "build-time"
    collection -> articles "glob loader 扫描 **/*.md" "file"
    pipeline -> articles "解析 frontmatter 与 $...$ 公式" "build-time"
    collection -> routes "zod schema 决定页面能读到哪些字段" "build-time"
    pipeline -> routes "编译产物注入 HTML" "build-time"

    build -> dist "astro build 写出 12 个路由" "file"
    media -> dist "原样拷贝" "file"
    dist -> cfhost "npx wrangler deploy 上传" "HTTPS / API"
    cfhost -> cfdns "由 blog.il7510n.dpdns.org 解析" "DNS"
    cfhost -> browser "按路由下发 HTML/CSS/JS" "HTTPS"
    browser -> media "加载封面与深度图（<img> + canvas data-depth）" "HTTPS"
    depthtool -> media "人工把生成的深度图放进 public/img" "file"

    // ── 运行时内部：总线才是真实依赖 ────────────────────────────
    journey -> fx "push 回调（index.astro:288/380/682）" "in-process"
    readguide -> fx "push(update)（[slug].astro:367）" "in-process"
    ecg -> fx "push 回调（EcgProgress.astro:93）" "in-process"
    fx -> journey "每帧驱动（Base.astro:85-92 遍历调用）" "rAF"
    fx -> readguide "每帧驱动" "rAF"
    fx -> ecg "每帧驱动" "rAF"
    transition -> session "写/删跳转记录（page-transition.ts:18,302-310）" "in-process"
    journey -> fluid "动态 import('../scripts/fluid.js')（index.astro:142）" "in-process"
    journey -> ecg "每帧现查 window.__ecgStrip，没建成就补 build()" "global"
    transition -> journey "派发 pt-back 事件，抑制首页开场重播" "DOM event"
  }

  views {
    systemContext blog "l1-context" {
      include *
      autolayout lr
    }

    container blog "l2-containers" {
      include *
      autolayout tb
    }

    component build "l3-build-components" {
      include *
      autolayout lr
    }

    component browser "l3-runtime-components" {
      include *
      autolayout lr
    }

    theme default
  }
}
