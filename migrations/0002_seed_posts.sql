-- 由 scripts/import-posts.mjs 生成，别手改：要改正文就改 src/content/blog 再重新生成。

-- deconstruct-lusion-scroll

DELETE FROM post_parts WHERE slug = 'deconstruct-lusion-scroll';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('deconstruct-lusion-scroll', 'md', 0, '
Lusion 的网站看起来玄，拆开全是基础功。

## 幕帘展开

图片进场不是淡入，而是 `clip-path: inset()` 从一侧收拢到展开——像窗帘拉开。配上 `cubic-bezier(0.22, 1, 0.36, 1)` 这种长尾缓动，就有「贵」的感觉。

## 滚动缩放

元素随它在视口中的位置在 0.92 到 1.0 之间插值缩放，只动 `transform`，合成器友好，60fps 无压力。

## 线条描绘

SVG path 设 `pathLength="1"`，把 `stroke-dashoffset` 从 1 减到 0，滚动进度直接映射过去——滚多少画多少，往回滚会倒着擦掉。

## 总结

没有黑魔法，只有克制：每处动效只服务一个目的，慢缓动 + 少量位移 = 高级感。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'deconstruct-lusion-scroll',
'test',
'把 Lusion 的滑动效果拆开看',
'2026-10-01',
NULL,
'/img/p2.jpg',
NULL,
'/img/p2-depth.webp'
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- glsl-first-gradient

DELETE FROM post_parts WHERE slug = 'glsl-first-gradient';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('glsl-first-gradient', 'md', 0, '
所有 shader 教程的第一课都是一张渐变，这不是没有道理的。

## uv 是什么

`uv` 是每个像素在画布上的归一化坐标，左下角 `(0, 0)`，右上角 `(1, 1)`。理解了这一点，一半的 shader 都不神秘了：

```glsl
float g = uv.x;           // 横向渐变
vec3 col = vec3(g);
```

## 渐变到波形

把 `uv.y` 和一个正弦函数比较，就能切出波形线：

```glsl
float line = smoothstep(0.01, 0.0, abs(uv.y - 0.5 + sin(uv.x * 10.0) * 0.1));
```

心电图的 QRS 波，无非是把正弦换成几个精心摆放的折线段。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'glsl-first-gradient',
'test',
'GLSL 入门笔记：从一张渐变开始',
'2026-09-20',
NULL,
'/img/p3.jpg',
NULL,
'/img/p3-depth.webp'
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- handwriting-stroke-order

DELETE FROM post_parts WHERE slug = 'handwriting-stroke-order';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('handwriting-stroke-order', 'md', 0, '
这篇文章顶上那行红字不是打字机打出来的，是一个字一个字**按笔顺写**出来的：
`H` 先竖后两横，`d` 先竖再合上圆圈，`#` 先两条竖杠后两条横。
逐字显影做不出这个 —— 逐字显影里 `d` 永远是一整个字同时出现。

标题这行字就是本文要讲的东西：怎么让一个**填充字体**（Caveat 这种，字体文件里
只有闭合轮廓）变成一个**能逐笔书写**的动画。

## 难点不在动画，在笔顺

"让字动起来"很容易，给每个字加个淡入、按 `--stagger` 依次延迟就行。
难的是**一笔是什么**。填充字体里没有"笔"这个概念，只有一圈闭合路径。
你直接 `stroke-dasharray` 去描这条闭合轮廓，描出来的是**字的边缘**，
不是笔画 —— 一笔画完形状就对了，中途全是空的轮廓线，而且顺序由字形轮廓的
点序决定，跟人手写的顺序毫无关系。

真正的解法是**反过来**：先算出中线（骨架），再由骨架生成笔顺。
我最后用的是 [tegaki](https://tegaki.ink/)（MIT），它的生成器有两条管线：

**`geometry`（默认，纯矢量）**

1. 对字形轮廓做**约束 Delaunay 三角化**，把字身的墨迹填成三角形网格
2. 取每个三角形的**弦轴（chordal axis）**当作笔画的中心线，弦长即该点笔宽
3. 剪掉尖角和拐角处伸出来的毛刺，被剪掉的那块墨用一笔椭圆笔尖印记补上
4. 笔画相交处把臂**配对**，让笔直着穿过去而不是拐个弯
5. 用宽度感知的 Ramer–Douglas–Peucker 简化，留下笔真正需要走的点
6. 定笔顺：拿 KanjiVG / Make Me a Hanzi / Hershey / Letterpaths 里墨迹最贴合的
   参考字形来定；都不像就退化成从上到下、从左到右

**`raster`（位图）**

扫描线填充（nonzero 规则）→ **Zhang-Suen 细化**成 1px 宽的骨架 →
走骨架像素成折线 → 距离变换算出每点的笔宽。更快，但多一道位图往返。

## 拿到笔顺之后

渲染层就退化成老问题了：每条笔画一条路径，一条 `stroke-dashoffset` 从全长
收到 0，配一个按笔顺累加的 `delay`。

```astro
<TegakiRenderer
  font={caveat}
  text="Handwriting, not typing."
  style="color: var(--ink-red)"
  time={{ mode: ''uncontrolled'', speed: 5 }}
/>
```

`speed` 是唯一需要调的旋钮。默认 `speed: 1` 写这一行要 10.4 秒，
`5` 倍速才落到 2 秒左右 —— 和它要配的页面节奏（拉牌入场、心电图）一样，
这个值得跟着别处的动画一起对。

## 三个真会踩的坑

**字体 bundle 比你想的大两个数量级。** Caveat 的 bundle 是 276KB：
`glyphData` 73KB 按字符索引，`glyphDataById` 202KB 按字形 id 索引。
后者**只有注册了 harfbuzz shaper 才会被读**，英文不注册就永远走不到 ——
直接丢掉，再把 `glyphData` 裁到这段文字用得到的字符，276KB 掉到十几 KB。

**同页多个实例会把体积翻倍。** 每个 `<TegakiRenderer font={对象}>` 都会把整个
bundle 序列化进一个 `<script type="application/json">`。注册一次、其余按
家族名引用。

**canvas 的位图不会被 `cloneNode` 复制。** 首页弯牌切片要把卡片克隆 11 份，
克隆片上的 canvas 是空白的 —— 和 `.fdpt` 视差画布同一个坑。
所以别把这个组件放进会被切片包裹的卡片里，或者改用 `toSVG` 在构建期导出成
真正的 SVG 路径（零客户端 JS，一行字约 29KB gzip）。

## 顺带

`prefers-reduced-motion` 下别硬放。这行标题在读者决定读不读这篇之前就得写完，
动和不动的信息量是一样的 —— tegaki 的 `reducedMotion="user"` 会直接把成品画出来。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'handwriting-stroke-order',
'test',
'让字体自己写出笔顺',
'2026-10-03',
NULL,
NULL,
'Handwriting, not typing.',
NULL
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- lenis-smooth-scroll

DELETE FROM post_parts WHERE slug = 'lenis-smooth-scroll';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('lenis-smooth-scroll', 'md', 0, '
本站的滚动用的是 Lenis，核心思路一句话：**不劫持滚动，只缓冲它**。

## 原理

监听原生滚轮事件，把目标位置记下来，然后每帧用插值（lerp）逼近：

```js
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

页面还是原生滚动，`scrollY` 照常更新，所以锚点、无障碍、SEO 全都不受影响。

## 手感参数

`lerp` 越小越「漂」，越大越「跟手」。0.1 左右是那种「页面有重量」的感觉，再小就开始晕车了。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'lenis-smooth-scroll',
'test',
'惯性滚动的手感是怎么调出来的',
'2026-09-15',
NULL,
'/img/p4.jpg',
NULL,
'/img/p4-depth.webp'
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- six-companies-ranking

DELETE FROM post_parts WHERE slug = 'six-companies-ranking';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('six-companies-ranking', 'md', 0, '
字节、美团、阿里、腾讯、百度、拼多多六家的高频算法题，按六家频次之和排序。公司列是「频次(该公司榜内排名)」，「—」= 没进这家公司的榜；Hot100 指力扣「热题 100」。

<!-- rank:begin -->
<div class="scroll">
<table class="rank"><thead><tr><th class="num">排名</th><th>题目</th><th>Hot100</th><th class="num">字节</th><th class="num">美团</th><th class="num">阿里</th><th class="num">腾讯</th><th class="num">百度</th><th class="num">拼多多</th><th class="num">总频次</th><th class="num">家数</th></tr></thead><tbody><tr><td class="num">1</td><td class="ttl"><span class="no">3.</span>无重复字符的最长子串</td><td class="hot">是</td><td class="num">687<span class="pr">(1)</span></td><td class="num">75<span class="pr">(8)</span></td><td class="num">65<span class="pr">(2)</span></td><td class="num">95<span class="pr">(3)</span></td><td class="num">34<span class="pr">(6)</span></td><td class="num">21<span class="pr">(1)</span></td><td class="num total">977</td><td class="num">6</td></tr><tr><td class="num">2</td><td class="ttl"><span class="no">146.</span>LRU缓存机制</td><td class="hot">是</td><td class="num">367<span class="pr">(2)</span></td><td class="num">47<span class="pr">(16)</span></td><td class="num">99<span class="pr">(1)</span></td><td class="num">193<span class="pr">(1)</span></td><td class="num">33<span class="pr">(7)</span></td><td class="num">21<span class="pr">(2)</span></td><td class="num total">760</td><td class="num">6</td></tr><tr><td class="num">3</td><td class="ttl"><span class="no">206.</span>反转链表</td><td class="hot">是</td><td class="num">243<span class="pr">(4)</span></td><td class="num">103<span class="pr">(1)</span></td><td class="num">30<span class="pr">(4)</span></td><td class="num">109<span class="pr">(2)</span></td><td class="num">75<span class="pr">(1)</span></td><td class="num">12<span class="pr">(7)</span></td><td class="num total">572</td><td class="num">6</td></tr><tr><td class="num">4</td><td class="ttl"><span class="no">215.</span>数组中的第K个最大元素</td><td class="hot">是</td><td class="num">205<span class="pr">(5)</span></td><td class="num">103<span class="pr">(2)</span></td><td class="num">34<span class="pr">(3)</span></td><td class="num">62<span class="pr">(6)</span></td><td class="num">46<span class="pr">(3)</span></td><td class="num">16<span class="pr">(5)</span></td><td class="num total">466</td><td class="num">6</td></tr><tr><td class="num">5</td><td class="ttl"><span class="no">25.</span>K个一组翻转链表</td><td class="hot">是</td><td class="num">303<span class="pr">(3)</span></td><td class="num">68<span class="pr">(10)</span></td><td class="num">23<span class="pr">(7)</span></td><td class="num">39<span class="pr">(10)</span></td><td class="num">14<span class="pr">(23)</span></td><td class="num off">—</td><td class="num total">447</td><td class="num">5</td></tr><tr><td class="num">6</td><td class="ttl"><span class="no">15.</span>三数之和</td><td class="hot">是</td><td class="num">187<span class="pr">(8)</span></td><td class="num">65<span class="pr">(11)</span></td><td class="num">29<span class="pr">(5)</span></td><td class="num">34<span class="pr">(14)</span></td><td class="num">46<span class="pr">(2)</span></td><td class="num">7<span class="pr">(16)</span></td><td class="num total">368</td><td class="num">6</td></tr><tr><td class="num">7</td><td class="ttl"><span class="no">53.</span>最大子数组和</td><td class="hot">是</td><td class="num">118<span class="pr">(17)</span></td><td class="num">37<span class="pr">(18)</span></td><td class="num">23<span class="pr">(8)</span></td><td class="num">69<span class="pr">(4)</span></td><td class="num">20<span class="pr">(12)</span></td><td class="num">16<span class="pr">(6)</span></td><td class="num total">283</td><td class="num">6</td></tr><tr><td class="num">8</td><td class="ttl"><span class="no">5.</span>最长回文子串</td><td class="hot">是</td><td class="num">138<span class="pr">(12)</span></td><td class="num">23<span class="pr">(32)</span></td><td class="num">14<span class="pr">(17)</span></td><td class="num">33<span class="pr">(16)</span></td><td class="num">35<span class="pr">(4)</span></td><td class="num">11<span class="pr">(8)</span></td><td class="num total">254</td><td class="num">6</td></tr><tr><td class="num">9</td><td class="ttl"><span class="no">补充题4.</span>手撕快速排序</td><td class="hot off">否</td><td class="num">65<span class="pr">(42)</span></td><td class="num">60<span class="pr">(12)</span></td><td class="num">18<span class="pr">(10)</span></td><td class="num">67<span class="pr">(5)</span></td><td class="num">34<span class="pr">(5)</span></td><td class="num">8<span class="pr">(12)</span></td><td class="num total">252</td><td class="num">6</td></tr><tr><td class="num">10</td><td class="ttl"><span class="no">21.</span>合并两个有序链表</td><td class="hot">是</td><td class="num">83<span class="pr">(30)</span></td><td class="num">71<span class="pr">(9)</span></td><td class="num">7<span class="pr">(40)</span></td><td class="num">61<span class="pr">(7)</span></td><td class="num">21<span class="pr">(11)</span></td><td class="num">5<span class="pr">(29)</span></td><td class="num total">248</td><td class="num">6</td></tr><tr><td class="num">11</td><td class="ttl"><span class="no">33.</span>搜索旋转排序数组</td><td class="hot">是</td><td class="num">160<span class="pr">(9)</span></td><td class="num">23<span class="pr">(30)</span></td><td class="num">18<span class="pr">(11)</span></td><td class="num">23<span class="pr">(28)</span></td><td class="num">12<span class="pr">(29)</span></td><td class="num">7<span class="pr">(14)</span></td><td class="num total">243</td><td class="num">6</td></tr><tr><td class="num">12</td><td class="ttl"><span class="no">121.</span>买卖股票的最佳时机</td><td class="hot">是</td><td class="num">148<span class="pr">(10)</span></td><td class="num">30<span class="pr">(23)</span></td><td class="num">11<span class="pr">(22)</span></td><td class="num">29<span class="pr">(20)</span></td><td class="num">10<span class="pr">(36)</span></td><td class="num">9<span class="pr">(10)</span></td><td class="num total">237</td><td class="num">6</td></tr><tr><td class="num">13</td><td class="ttl"><span class="no">1.</span>两数之和</td><td class="hot">是</td><td class="num">127<span class="pr">(15)</span></td><td class="num">30<span class="pr">(24)</span></td><td class="num">27<span class="pr">(6)</span></td><td class="num">30<span class="pr">(19)</span></td><td class="num">19<span class="pr">(14)</span></td><td class="num off">—</td><td class="num total">233</td><td class="num">5</td></tr><tr><td class="num">14</td><td class="ttl"><span class="no">102.</span>二叉树的层序遍历</td><td class="hot">是</td><td class="num">88<span class="pr">(26)</span></td><td class="num">84<span class="pr">(5)</span></td><td class="num">15<span class="pr">(13)</span></td><td class="num">22<span class="pr">(32)</span></td><td class="num">19<span class="pr">(15)</span></td><td class="num off">—</td><td class="num total">228</td><td class="num">5</td></tr><tr><td class="num">15</td><td class="ttl"><span class="no">200.</span>岛屿数量</td><td class="hot">是</td><td class="num">191<span class="pr">(6)</span></td><td class="num off">—</td><td class="num">13<span class="pr">(18)</span></td><td class="num off">—</td><td class="num">17<span class="pr">(17)</span></td><td class="num">5<span class="pr">(23)</span></td><td class="num total">226</td><td class="num">4</td></tr><tr><td class="num">16</td><td class="ttl"><span class="no">103.</span>二叉树的锯齿形层次遍历</td><td class="hot off">否</td><td class="num">189<span class="pr">(7)</span></td><td class="num">20<span class="pr">(35)</span></td><td class="num">11<span class="pr">(23)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">220</td><td class="num">3</td></tr><tr><td class="num">17</td><td class="ttl"><span class="no">46.</span>全排列</td><td class="hot">是</td><td class="num">124<span class="pr">(16)</span></td><td class="num">25<span class="pr">(28)</span></td><td class="num">14<span class="pr">(15)</span></td><td class="num">21<span class="pr">(34)</span></td><td class="num">23<span class="pr">(10)</span></td><td class="num">6<span class="pr">(17)</span></td><td class="num total">213</td><td class="num">6</td></tr><tr><td class="num">18</td><td class="ttl"><span class="no">88.</span>合并两个有序数组</td><td class="hot off">否</td><td class="num">96<span class="pr">(22)</span></td><td class="num">94<span class="pr">(4)</span></td><td class="num">8<span class="pr">(34)</span></td><td class="num off">—</td><td class="num">15<span class="pr">(22)</span></td><td class="num off">—</td><td class="num total">213</td><td class="num">4</td></tr><tr><td class="num">19</td><td class="ttl"><span class="no">20.</span>有效的括号</td><td class="hot">是</td><td class="num">90<span class="pr">(24)</span></td><td class="num">35<span class="pr">(21)</span></td><td class="num">13<span class="pr">(19)</span></td><td class="num">38<span class="pr">(11)</span></td><td class="num">24<span class="pr">(9)</span></td><td class="num off">—</td><td class="num total">200</td><td class="num">5</td></tr><tr><td class="num">20</td><td class="ttl"><span class="no">54.</span>螺旋矩阵</td><td class="hot">是</td><td class="num">138<span class="pr">(11)</span></td><td class="num">27<span class="pr">(26)</span></td><td class="num off">—</td><td class="num">18<span class="pr">(40)</span></td><td class="num off">—</td><td class="num">16<span class="pr">(4)</span></td><td class="num total">199</td><td class="num">4</td></tr><tr><td class="num">21</td><td class="ttl"><span class="no">143.</span>重排链表</td><td class="hot off">否</td><td class="num">91<span class="pr">(23)</span></td><td class="num">100<span class="pr">(3)</span></td><td class="num">7<span class="pr">(39)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">198</td><td class="num">3</td></tr><tr><td class="num">22</td><td class="ttl"><span class="no">141.</span>环形链表</td><td class="hot">是</td><td class="num">83<span class="pr">(29)</span></td><td class="num">52<span class="pr">(13)</span></td><td class="num">15<span class="pr">(12)</span></td><td class="num">23<span class="pr">(29)</span></td><td class="num">24<span class="pr">(8)</span></td><td class="num off">—</td><td class="num total">197</td><td class="num">5</td></tr><tr><td class="num">23</td><td class="ttl"><span class="no">300.</span>最长上升子序列</td><td class="hot">是</td><td class="num">109<span class="pr">(20)</span></td><td class="num off">—</td><td class="num">8<span class="pr">(33)</span></td><td class="num">50<span class="pr">(8)</span></td><td class="num">15<span class="pr">(19)</span></td><td class="num">5<span class="pr">(20)</span></td><td class="num total">187</td><td class="num">5</td></tr><tr><td class="num">24</td><td class="ttl"><span class="no">23.</span>合并K个排序链表</td><td class="hot">是</td><td class="num">112<span class="pr">(19)</span></td><td class="num">19<span class="pr">(38)</span></td><td class="num">11<span class="pr">(24)</span></td><td class="num">28<span class="pr">(23)</span></td><td class="num">8<span class="pr">(37)</span></td><td class="num">8<span class="pr">(13)</span></td><td class="num total">186</td><td class="num">6</td></tr><tr><td class="num">25</td><td class="ttl"><span class="no">415.</span>字符串相加</td><td class="hot off">否</td><td class="num">86<span class="pr">(28)</span></td><td class="num">41<span class="pr">(17)</span></td><td class="num">10<span class="pr">(29)</span></td><td class="num">46<span class="pr">(9)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num total">183</td><td class="num">4</td></tr><tr><td class="num">26</td><td class="ttl"><span class="no">92.</span>反转链表II</td><td class="hot off">否</td><td class="num">80<span class="pr">(31)</span></td><td class="num">79<span class="pr">(6)</span></td><td class="num">9<span class="pr">(31)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">5<span class="pr">(21)</span></td><td class="num total">173</td><td class="num">4</td></tr><tr><td class="num">27</td><td class="ttl"><span class="no">56.</span>合并区间</td><td class="hot">是</td><td class="num">79<span class="pr">(32)</span></td><td class="num">29<span class="pr">(25)</span></td><td class="num">9<span class="pr">(30)</span></td><td class="num">24<span class="pr">(27)</span></td><td class="num">13<span class="pr">(25)</span></td><td class="num">17<span class="pr">(3)</span></td><td class="num total">171</td><td class="num">6</td></tr><tr><td class="num">28</td><td class="ttl"><span class="no">236.</span>二叉树的最近公共祖先</td><td class="hot">是</td><td class="num">132<span class="pr">(13)</span></td><td class="num">20<span class="pr">(36)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">13<span class="pr">(27)</span></td><td class="num off">—</td><td class="num total">165</td><td class="num">3</td></tr><tr><td class="num">29</td><td class="ttl"><span class="no">1143.</span>最长公共子序列</td><td class="hot">是</td><td class="num">60<span class="pr">(46)</span></td><td class="num">23<span class="pr">(31)</span></td><td class="num">11<span class="pr">(21)</span></td><td class="num">29<span class="pr">(21)</span></td><td class="num">20<span class="pr">(13)</span></td><td class="num off">—</td><td class="num total">143</td><td class="num">5</td></tr><tr><td class="num">30</td><td class="ttl"><span class="no">93.</span>复原IP地址</td><td class="hot off">否</td><td class="num">63<span class="pr">(43)</span></td><td class="num">50<span class="pr">(14)</span></td><td class="num off">—</td><td class="num">22<span class="pr">(33)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num total">135</td><td class="num">3</td></tr><tr><td class="num">31</td><td class="ttl"><span class="no">165.</span>比较版本号</td><td class="hot off">否</td><td class="num">71<span class="pr">(35)</span></td><td class="num">21<span class="pr">(33)</span></td><td class="num">14<span class="pr">(16)</span></td><td class="num">23<span class="pr">(30)</span></td><td class="num off">—</td><td class="num">4<span class="pr">(31)</span></td><td class="num total">133</td><td class="num">5</td></tr><tr><td class="num">32</td><td class="ttl"><span class="no">124.</span>二叉树中的最大路径和</td><td class="hot">是</td><td class="num">78<span class="pr">(33)</span></td><td class="num">48<span class="pr">(15)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">5<span class="pr">(25)</span></td><td class="num total">131</td><td class="num">3</td></tr><tr><td class="num">33</td><td class="ttl"><span class="no">42.</span>接雨水</td><td class="hot">是</td><td class="num">130<span class="pr">(14)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">130</td><td class="num">1</td></tr><tr><td class="num">34</td><td class="ttl"><span class="no">4.</span>寻找两个正序数组的中位数</td><td class="hot">是</td><td class="num">69<span class="pr">(39)</span></td><td class="num off">—</td><td class="num">12<span class="pr">(20)</span></td><td class="num">25<span class="pr">(26)</span></td><td class="num">16<span class="pr">(18)</span></td><td class="num">7<span class="pr">(15)</span></td><td class="num total">129</td><td class="num">5</td></tr><tr><td class="num">35</td><td class="ttl"><span class="no">160.</span>相交链表</td><td class="hot">是</td><td class="num">116<span class="pr">(18)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">12<span class="pr">(30)</span></td><td class="num off">—</td><td class="num total">128</td><td class="num">2</td></tr><tr><td class="num">36</td><td class="ttl"><span class="no">82.</span>删除排序链表中的重复元素II</td><td class="hot off">否</td><td class="num">49<span class="pr">(56)</span></td><td class="num">77<span class="pr">(7)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">126</td><td class="num">2</td></tr><tr><td class="num">37</td><td class="ttl"><span class="no">19.</span>删除链表的倒数第N个节点</td><td class="hot">是</td><td class="num">51<span class="pr">(54)</span></td><td class="num">36<span class="pr">(19)</span></td><td class="num">19<span class="pr">(9)</span></td><td class="num off">—</td><td class="num">13<span class="pr">(26)</span></td><td class="num off">—</td><td class="num total">119</td><td class="num">4</td></tr><tr><td class="num">38</td><td class="ttl"><span class="no">72.</span>编辑距离</td><td class="hot">是</td><td class="num">86<span class="pr">(27)</span></td><td class="num off">—</td><td class="num">11<span class="pr">(26)</span></td><td class="num off">—</td><td class="num">15<span class="pr">(20)</span></td><td class="num">5<span class="pr">(26)</span></td><td class="num total">117</td><td class="num">4</td></tr><tr><td class="num">39</td><td class="ttl"><span class="no">199.</span>二叉树的右视图</td><td class="hot">是</td><td class="num">90<span class="pr">(25)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">15<span class="pr">(21)</span></td><td class="num off">—</td><td class="num total">105</td><td class="num">2</td></tr><tr><td class="num">40</td><td class="ttl"><span class="no">31.</span>下一个排列</td><td class="hot">是</td><td class="num">103<span class="pr">(21)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">103</td><td class="num">1</td></tr><tr><td class="num">41</td><td class="ttl"><span class="no">142.</span>环形链表II</td><td class="hot">是</td><td class="num">49<span class="pr">(58)</span></td><td class="num">36<span class="pr">(20)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">13<span class="pr">(28)</span></td><td class="num off">—</td><td class="num total">98</td><td class="num">3</td></tr><tr><td class="num">42</td><td class="ttl"><span class="no">70.</span>爬楼梯</td><td class="hot">是</td><td class="num">40<span class="pr">(78)</span></td><td class="num off">—</td><td class="num">8<span class="pr">(37)</span></td><td class="num">27<span class="pr">(24)</span></td><td class="num">17<span class="pr">(16)</span></td><td class="num off">—</td><td class="num total">92</td><td class="num">4</td></tr><tr><td class="num">43</td><td class="ttl"><span class="no">8.</span>字符串转换整数(atoi)</td><td class="hot off">否</td><td class="num">29<span class="pr">(96)</span></td><td class="num">27<span class="pr">(27)</span></td><td class="num off">—</td><td class="num">32<span class="pr">(17)</span></td><td class="num off">—</td><td class="num">4<span class="pr">(30)</span></td><td class="num total">92</td><td class="num">4</td></tr><tr><td class="num">44</td><td class="ttl"><span class="no">43.</span>字符串相乘</td><td class="hot off">否</td><td class="num">49<span class="pr">(57)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">28<span class="pr">(22)</span></td><td class="num off">—</td><td class="num">9<span class="pr">(9)</span></td><td class="num total">86</td><td class="num">3</td></tr><tr><td class="num">45</td><td class="ttl"><span class="no">2.</span>两数相加</td><td class="hot">是</td><td class="num">49<span class="pr">(61)</span></td><td class="num">18<span class="pr">(39)</span></td><td class="num off">—</td><td class="num">19<span class="pr">(39)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num total">86</td><td class="num">3</td></tr><tr><td class="num">46</td><td class="ttl"><span class="no">76.</span>最小覆盖子串</td><td class="hot">是</td><td class="num">53<span class="pr">(52)</span></td><td class="num off">—</td><td class="num">8<span class="pr">(32)</span></td><td class="num">19<span class="pr">(37)</span></td><td class="num off">—</td><td class="num">4<span class="pr">(34)</span></td><td class="num total">84</td><td class="num">4</td></tr><tr><td class="num">47</td><td class="ttl"><span class="no">232.</span>用栈实现队列</td><td class="hot off">否</td><td class="num">52<span class="pr">(53)</span></td><td class="num">24<span class="pr">(29)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">8<span class="pr">(38)</span></td><td class="num off">—</td><td class="num total">84</td><td class="num">3</td></tr><tr><td class="num">48</td><td class="ttl"><span class="no">148.</span>排序链表</td><td class="hot">是</td><td class="num">69<span class="pr">(40)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">13<span class="pr">(24)</span></td><td class="num off">—</td><td class="num total">82</td><td class="num">2</td></tr><tr><td class="num">49</td><td class="ttl"><span class="no">322.</span>零钱兑换</td><td class="hot">是</td><td class="num">59<span class="pr">(47)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">23<span class="pr">(31)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num total">82</td><td class="num">2</td></tr><tr><td class="num">50</td><td class="ttl"><span class="no">470.</span>用Rand7()实现Rand10()</td><td class="hot off">否</td><td class="num">47<span class="pr">(63)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">34<span class="pr">(15)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num total">81</td><td class="num">2</td></tr><tr><td class="num">51</td><td class="ttl"><span class="no">22.</span>括号生成</td><td class="hot">是</td><td class="num">67<span class="pr">(41)</span></td><td class="num off">—</td><td class="num">7<span class="pr">(38)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">6<span class="pr">(19)</span></td><td class="num total">80</td><td class="num">3</td></tr><tr><td class="num">52</td><td class="ttl"><span class="no">69.</span>x的平方根</td><td class="hot off">否</td><td class="num">69<span class="pr">(38)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">11<span class="pr">(33)</span></td><td class="num off">—</td><td class="num total">80</td><td class="num">2</td></tr><tr><td class="num">53</td><td class="ttl"><span class="no">704.</span>二分查找</td><td class="hot off">否</td><td class="num off">—</td><td class="num">33<span class="pr">(22)</span></td><td class="num off">—</td><td class="num">35<span class="pr">(13)</span></td><td class="num">11<span class="pr">(32)</span></td><td class="num off">—</td><td class="num total">79</td><td class="num">3</td></tr><tr><td class="num">54</td><td class="ttl"><span class="no">32.</span>最长有效括号</td><td class="hot">是</td><td class="num">70<span class="pr">(37)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">8<span class="pr">(11)</span></td><td class="num total">78</td><td class="num">2</td></tr><tr><td class="num">55</td><td class="ttl"><span class="no">239.</span>滑动窗口最大值</td><td class="hot">是</td><td class="num">47<span class="pr">(64)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num">25<span class="pr">(25)</span></td><td class="num off">—</td><td class="num">5<span class="pr">(24)</span></td><td class="num total">77</td><td class="num">3</td></tr><tr><td class="num">56</td><td class="ttl"><span class="no">94.</span>二叉树的中序遍历</td><td class="hot">是</td><td class="num">45<span class="pr">(70)</span></td><td class="num off">—</td><td class="num">11<span class="pr">(25)</span></td><td class="num off">—</td><td class="num">12<span class="pr">(31)</span></td><td class="num">5<span class="pr">(28)</span></td><td class="num total">73</td><td class="num">4</td></tr><tr><td class="num">57</td><td class="ttl"><span class="no">41.</span>缺失的第一个正数</td><td class="hot">是</td><td class="num">73<span class="pr">(34)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">73</td><td class="num">1</td></tr><tr><td class="num">58</td><td class="ttl"><span class="no">221.</span>最大正方形</td><td class="hot off">否</td><td class="num">71<span class="pr">(36)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">71</td><td class="num">1</td></tr><tr><td class="num">59</td><td class="ttl"><span class="no">105.</span>从前序与中序遍历序列构造二叉树</td><td class="hot">是</td><td class="num">62<span class="pr">(45)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">4<span class="pr">(32)</span></td><td class="num total">66</td><td class="num">2</td></tr><tr><td class="num">60</td><td class="ttl"><span class="no">394.</span>字符串解码</td><td class="hot">是</td><td class="num">58<span class="pr">(49)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">5<span class="pr">(27)</span></td><td class="num total">63</td><td class="num">2</td></tr><tr><td class="num">61</td><td class="ttl"><span class="no">101.</span>对称二叉树</td><td class="hot">是</td><td class="num">63<span class="pr">(44)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">63</td><td class="num">1</td></tr><tr><td class="num">62</td><td class="ttl"><span class="no">39.</span>组合总和</td><td class="hot">是</td><td class="num">56<span class="pr">(50)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">4<span class="pr">(37)</span></td><td class="num total">60</td><td class="num">2</td></tr><tr><td class="num">63</td><td class="ttl"><span class="no">78.</span>子集</td><td class="hot">是</td><td class="num">49<span class="pr">(60)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">10<span class="pr">(35)</span></td><td class="num off">—</td><td class="num total">59</td><td class="num">2</td></tr><tr><td class="num">64</td><td class="ttl"><span class="no">剑指Offer22.</span>链表中倒数第k个节点</td><td class="hot off">否</td><td class="num">40<span class="pr">(79)</span></td><td class="num">19<span class="pr">(37)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">59</td><td class="num">2</td></tr><tr><td class="num">65</td><td class="ttl"><span class="no">129.</span>求根到叶子节点数字之和</td><td class="hot off">否</td><td class="num">59<span class="pr">(48)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">59</td><td class="num">1</td></tr><tr><td class="num">66</td><td class="ttl"><span class="no">662.</span>二叉树最大宽度</td><td class="hot off">否</td><td class="num">54<span class="pr">(51)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">54</td><td class="num">1</td></tr><tr><td class="num">67</td><td class="ttl"><span class="no">155.</span>最小栈</td><td class="hot">是</td><td class="num">42<span class="pr">(76)</span></td><td class="num off">—</td><td class="num">10<span class="pr">(28)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">52</td><td class="num">2</td></tr><tr><td class="num">68</td><td class="ttl"><span class="no">209.</span>长度最小的子数组</td><td class="hot off">否</td><td class="num">51<span class="pr">(55)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">51</td><td class="num">1</td></tr><tr><td class="num">69</td><td class="ttl"><span class="no">695.</span>岛屿的最大面积</td><td class="hot off">否</td><td class="num">46<span class="pr">(67)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num">4<span class="pr">(38)</span></td><td class="num total">50</td><td class="num">2</td></tr><tr><td class="num">70</td><td class="ttl"><span class="no">162.</span>寻找峰值</td><td class="hot off">否</td><td class="num">49<span class="pr">(59)</span></td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num off">—</td><td class="num total">49</td><td class="num">1</td></tr></tbody></table>
</div>
<p class="fine">共 70 题。原表到第 70 名截断，往后的名次没有录。</p>
<!-- rank:end -->');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'six-companies-ranking',
'leetcode',
'六家综合排行',
'2026-10-07',
NULL,
NULL,
NULL,
NULL
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- ubiquitous-language

DELETE FROM post_parts WHERE slug = 'ubiquitous-language';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('ubiquitous-language', 'md', 0, '
> 示例文章：拿来验阅读导引的标尺分档。这篇有 h1 / h2 / h3 **三层齐全**，
> 所以标尺的中间档会和只有两层的文章不一样 —— 层级总数变了，边长要重算。

**适用范围**：本目录下所有正文、补充材料、写作参考文档、计算报告与 Python 脚本。
**规则**：同一概念全项目只用一个符号；一个符号只承载一个概念。作废写法不再使用。单位一律写 $\text{LaTeX}$ 形式（$\text{cm}^{-3}$、$\text{nC}/\text{m}$），正文与图注中不用 Unicode 上标。
**状态**：样品参数与光强标定已实测确定；复合机制已判定为纯俄歇极限；**耗尽近似在全部实测光强下失效，式 (d)(e) 待替换**——见 §八。
**本轮变更**：§17–18 定案激光标定与光斑直径，§19 定案纯俄歇极限，§20–21 判定耗尽近似全区间失效。

---

## 〇、样品与光强标定（实测确定）

| 项 | 值 | 来源 |
| --- | --- | --- |
| 材料 | FZ 高阻单晶硅，**未掺杂**，双面抛光，(100) 面 | — |
| 电阻率 $\rho$ | $>10^{4}\ \Omega\cdot\text{cm}$ | MTI (100) 高阻 FZ |
| 几何 $L/a/t$ | $20/10/0.5\ \text{mm}$ | — |
| 体缺陷 | 极少，**SRH 体复合可忽略** | FZ 工艺 |
| 激光标定 | $P_{\mathrm{laser}}(\text{mW})=1312\,I_{A}(\text{A})-85.124$ | 功率计标定 |
| 工作电流 | $I_{A}\in[0.08,\ 0.34]\ \text{A}$；低于 $0.08\ \text{A}$ 为暗态 | — |
| 对应功率 | $19.8\ \text{mW}\ \leftrightarrow\ 361\ \text{mW}$ | 由上式换算 |
| 光斑 | **直径** $d_{\mathrm{spot}}=0.75\ \text{mm}$，$w_{0}=375\ \mu\text{m}$，$A_{\mathrm{spot}}=\pi w_{0}^{2}=4.418\times10^{-3}\ \text{cm}^{2}$ | — |
| **入射光强** | $I_{\mathrm{light}}=P_{\mathrm{laser}}/A_{\mathrm{spot}}$ $\in[4.49,\ 81.7]\ \text{W}/\text{cm}^{2}$ | — |

正文光强区间一律写 **"$4.5$–$82\ \text{W}/\text{cm}^{2}$"**，暗态单独作为 $I_{A}<0.08\ \text{A}$ 的对照点。不得写 $0$–$80$：$0\ \text{W}/\text{cm}^{2}$ 属暗态，不是本模型的连续变量。

---

## 一、术语（中文 / 英文 / 符号）

### 1. 效应与机制

| 术语 | 符号 | 定义 | 作废写法 |
| --- | --- | --- | --- |
| **光挠曲电效应** | — | 光照改变半导体等效挠曲电系数的现象（photoflexoelectric effect） | 光致挠曲电、光照增强挠曲电、光电挠曲电 |
| **等效挠曲电系数** | $\mu_{\mathrm{eff}}$ | 极化对照变应变梯度的斜率，单位 $\text{nC}/\text{m}$ | 有效挠曲电系数、表观挠曲电系数、$\mu_{13}^{\mathrm{eff}}$ |
| **本征体挠曲电系数** | $\mu_{\mathrm{bulk}}$ | 无势垒层贡献时材料本身的挠曲电系数（硅约 $1\ \text{nC}/\text{m}$） | 暗态挠曲电系数 |
| **挠曲光伏效应** | — | 应变梯度驱动的非平衡载流子分离产生 $V_{oc}/I_{sc}$ | 与**光挠曲电效应**混用 |
| **势垒层** | — | 金属/半导体界面附近的空间电荷区（barrier layer） | 耗尽层、空间电荷区、贫化层 |
| **表面形变势** | $\varphi$ | 表面应变引起的势垒高度变化量，单位 $\text{eV}$ | 形变势常数、$\Xi$、$\phi$ |

### 2. 实验量

| 术语 | 符号 | 定义 | 作废写法 |
| --- | --- | --- | --- |
| **应变梯度** | $\partial\epsilon_{11}/\partial x_{3}$ | 沿厚度方向的轴向应变梯度，单位 $\text{m}^{-1}$ | $G$、$\kappa''$、$\epsilon$ |
| **曲率** | $\kappa$ | 梁的中面曲率，单位 $\text{m}^{-1}$ | $G$ |
| **挠度** | $\delta$ | 样品中心点位移，单位 $\text{mm}$ | $d$、$\Delta$ |
| **支撑间距** | $L$ | 三点弯曲两支撑条间距（$20\ \text{mm}$） | — |
| **电极半长** | $a$ | 覆盖区自梁中点算起的半长度（$10\ \text{mm}$） | — |
| **感应电荷** | $Q$ | 电荷放大器测得的第一谐波电荷，单位 $\text{C}$ | $q$ |
| **极化** | $P_{3}$ | 厚度方向极化 $=Q/A$，单位 $\text{C}/\text{m}^{2}$ | $\sigma$ |
| **电极面积** | $A$ | 单个电极覆盖面积，单位 $\text{cm}^{2}$ | $S$ |
| **样品厚度** | $t$ | 沿 $x_{3}$ 方向厚度（$0.5\ \text{mm}$） | $h$、$d$ |

### 3. 光与载流子产生

| 术语 | 符号 | 定义 | 作废写法 |
| --- | --- | --- | --- |
| **入射光强** | $I_{\mathrm{light}}$ | 样品表面入射光功率密度，$\in[4.49,\ 81.7]\ \text{W}/\text{cm}^{2}$ | $I$、$P$、$I_{0}$ |
| **激光电流** | $I_{A}$ | 激光器驱动电流，$\in[0.08,\ 0.34]\ \text{A}$ | — |
| **激光功率** | $P_{\mathrm{laser}}$ | $P_{\mathrm{laser}}=1312I_{A}-85.124$，单位 $\text{mW}$ | $P$ |
| **光子通量** | $\Phi_{\mathrm{ph}}$ | $I_{\mathrm{light}}/h\nu$，单位 $\text{photons}\cdot\text{cm}^{-2}\text{s}^{-1}$ | $\Phi$、$N_{\mathrm{ph}}$ |
| **体积产生率** | $G$ | 单位体积单位时间产生的电子-空穴对数，单位 $\text{cm}^{-3}\text{s}^{-1}$ | $R_{g}$、$\beta\alpha I$ |
| **面注入通量** | $\Phi_{\mathrm{gen}}$ | 体光生折算到入射面的载流子通量，单位 $\text{cm}^{-2}\text{s}^{-1}$ | $\Phi_{0}$ |
| **总产生速率** | $G_{\mathrm{tot}}$ | 整个样品每秒产生的电子-空穴对总数，单位 $\text{s}^{-1}$ | $Q_{0}$ |
| **吸收系数** | $\alpha$ | 光强按 $e^{-\alpha x_{2}}$ 衰减的比例系数，单位 $\text{cm}^{-1}$ | $a$ |
| **反射率** | $R_{\mathrm{f}}$ | 表面反射份额，无量纲 | $R$（裸用） |
| **穿透深度** | $1/\alpha$ | 光强衰减到 $1/e$ 的距离，单位 $\text{nm}$ | $\delta_{\mathrm{opt}}$ |

### 4. 载流子与复合

| 术语 | 符号 | 定义 | 作废写法 |
| --- | --- | --- | --- |
| **本征载流子浓度** | $n_{i}$ | $300\ \text{K}$ 热平衡 $n=p$ 的浓度，单位 $\text{cm}^{-3}$ | $n_{0}$、$N_{0}$、$N_{C}$ |
| **电离掺杂浓度** | $N_{\mathrm{D}}$ | 由电阻率反推的施主浓度（材料实为未掺杂，此值仅表征补偿后净施主） | $N$ |
| **暗态载流子浓度** | $n_{0}$ | 无光照时可动载流子浓度；未掺杂材料 $n_{0}\approx n_{i}$ | $N_{0}$ |
| **光生载流子浓度** | $\Delta n$ | 光照引起的载流子浓度增量（电子=空穴） | $\Delta N$、$\Delta N_{s}$、$\Delta p$ |
| **有效载流子浓度** | $N_{\mathrm{eff}}$ | 代入势垒层公式的总量 $n_{0}+\Delta n$ | $N$（裸用） |
| **SRH 有效寿命** | $\tau_{\mathrm{eff}}$ | 表面复合限制的等效复合时间，$\approx5\ \text{ms}$；**只用于 $L_{d}$，不进产生方程** | $\tau$（裸用） |
| **俄歇系数** | $C_{A}$ | 本征俄歇复合三阶系数，单位 $\text{cm}^{6}\text{s}^{-1}$ | $C_{n}$、$r$ |
| **辐射复合系数** | $B$ | 双分子辐射复合系数，单位 $\text{cm}^{3}\text{s}^{-1}$ | $r$、`r_cm3` |
| **电子/空穴扩散系数** | $D_{n},D_{p}$ | 由爱因斯坦关系 $D=\mu k_{B}T/q$ 得，$34.9$ / $12.4\ \text{cm}^{2}\text{s}^{-1}$ | $D$（裸用） |
| **双极扩散系数** | $D_{a}$ | $D_{a}=2D_{n}D_{p}/(D_{n}+D_{p})=18.3\ \text{cm}^{2}\text{s}^{-1}$，高注入下扩散用此值 | — |
| **扩散长度** | $L_{d}$ | $\sqrt{D_{a}\tau_{\mathrm{eff}}}\approx3.0\ \text{mm}$ | $L$ |
| **俄歇/SRH 交叉浓度** | $\Delta n_{c}$ | $1/\sqrt{C_{A}\tau_{\mathrm{eff}}}\approx1.4\times10^{16}\ \text{cm}^{-3}$ | $\Delta N_{c}$ |

### 5. 势垒与挠曲电响应

| 术语 | 符号 | 定义 | 作废写法 |
| --- | --- | --- | --- |
| **肖特基势垒高度** | $\Phi_{B}$ | 金属费米能级到半导体导带底的能量差，单位 $\text{eV}$（Au/n-Si 实测 $0.76$–$0.81$） | $\phi_{B}$ |
| **暗态内建电势** | $\phi$ | 暗态平衡能带弯曲量，单位 $\text{V}$；实测活化能法 $\phi=0.246\ \text{V}$ | "$\phi=1.05\ \text{eV}$"、$V_{bi}$ |
| **表面电势** | $\psi_{s}$ | 非平衡下界面处静电势，相对体内基准，单位 $\text{V}$；**精确解的边界条件量** | $\phi_{\mathrm{eff}}$ |
| **准费米能级分裂** | $\Delta E_{F}$ | $E_{Fn}-E_{Fp}$，单位 $\text{eV}$ 或 $\text{V}$（配 $q$ 显式换算） | $\Delta\phi$ |
| **光照下有效内建电势** | $\phi_{\mathrm{eff}}$ | 耗尽近似下的 $\phi+\Delta\phi$，单位 $\text{V}$；**本工作区间内为负，仅作失效判据** | $\phi_{\mathrm{eff}}$ 作有效量使用 |
| **势垒层宽度** | $W$ | 耗尽近似下 $W=\sqrt{2\epsilon_{0}\epsilon_{r}\phi_{\mathrm{eff}}/(qN_{\mathrm{eff}})}$，单位 $\text{cm}$ | $d$、$W_{\mathrm{dep}}$ |
| **界面电荷面密度** | $\sigma_{s}$ | 势垒层净电荷面密度，单位 $\text{C}/\text{cm}^{2}$ | $\sigma$ |
| **介电常数** | $\epsilon_{0},\ \epsilon_{r}$ | $8.854\times10^{-14}\ \text{F}/\text{cm}$ 与 $11.7$ | $\varepsilon$ 不带下标 |

---

## 二、常量取值（全项目统一）

| 量 | 符号 | **定值** | 单位 | 备注 |
| --- | --- | --- | --- | --- |
| 激光波长 | $\lambda$ | **$405$** | $\text{nm}$ | 写作 $405\ \text{nm}$，数字与单位间空格 |
| 光子能量 | $h\nu$ | **$3.06\ \text{eV}=4.90\times10^{-19}\ \text{J}$** | — | 由 $405\ \text{nm}$ 算出，只此一套 |
| 硅带隙 | $E_{g}$ | **$1.12$** | $\text{eV}$ | $300\ \text{K}$ |
| 本征载流子浓度 | $n_{i}$ | **$1.5\times10^{10}$** | $\text{cm}^{-3}$ | $300\ \text{K}$ |
| 温度 | $T$ | **$300$** | $\text{K}$ | 热势 $k_{B}T/q=25.85\ \text{mV}$ |
| 相对介电常数 | $\epsilon_{r}$ | **$11.7$** | — | Si |
| 元电荷 | $q$ | **$1.602\times10^{-19}$** | $\text{C}$ | — |
| 真空介电常数 | $\epsilon_{0}$ | **$8.854\times10^{-14}$** | $\text{F}/\text{cm}$ | 长度用 $\text{cm}$ 时配 $\text{cm}^{-3}$ |
| 电阻率 | $\rho$ | **$>10^{4}$** | $\Omega\cdot\text{cm}$ | — |
| 电离掺杂浓度 | $N_{\mathrm{D}}$ | **$4.6\times10^{11}$** | $\text{cm}^{-3}$ | 由 $\rho$ 与 $\mu_{n}=1350\ \text{cm}^{2}\text{V}^{-1}\text{s}^{-1}$ 反推 |
| 电子/空穴迁移率 | $\mu_{n},\mu_{p}$ | **$1350$ / $480$** | $\text{cm}^{2}\text{V}^{-1}\text{s}^{-1}$ | 轻掺杂值 |
| 扩散系数 | $D_{n},D_{p}$ | **$34.9$ / $12.4$** | $\text{cm}^{2}\text{s}^{-1}$ | 爱因斯坦关系 |
| 双极扩散系数 | $D_{a}$ | **$18.3$** | $\text{cm}^{2}\text{s}^{-1}$ | 高注入扩散实际使用值 |
| SRH 有效寿命 | $\tau_{\mathrm{eff}}$ | **$\approx5$** | $\text{ms}$ | 表面限制 $t/2S$（$S\approx5\ \text{cm/s}$）；**只进 $L_{d}$** |
| 扩散长度 | $L_{d}$ | **$\approx3.0$** | $\text{mm}$ | $\gg t$，载流子横向输运不受限 |
| 俄歇系数 | $C_{A}$ | **$1\times10^{-30}$** | $\text{cm}^{6}\text{s}^{-1}$ | 区间 $10^{-31}\sim10^{-30}$；**主导通道** |
| 辐射复合系数 | $B$ | **$4.7\times10^{-15}$** | $\text{cm}^{3}\text{s}^{-1}$ | 硅间接带隙，任何注入下都不主导 |
| 吸收系数 | $\alpha$ | **$1.5\times10^{5}$** | $\text{cm}^{-1}$ | $1/\alpha\approx100\ \text{nm}$；敏感性 $0.8\sim1.5\times10^{5}$ |
| 反射率 | $R_{\mathrm{f}}$ | **$0.45$** | — | 敏感性 $0.42\sim0.48$ |
| 光斑直径 | $d_{\mathrm{spot}}$ | **$0.75$** | $\text{mm}$ | **直径**；$w_{0}=375\ \mu\text{m}$ |
| 激光功率 | $P_{\mathrm{laser}}$ | **$1312I_{A}-85.124$** | $\text{mW}$ | $I_{A}\in[0.08,0.34]\ \text{A}$ |
| 入射光强 | $I_{\mathrm{light}}$ | **$4.49\sim81.7$** | $\text{W}/\text{cm}^{2}$ | $=P_{\mathrm{laser}}/A_{\mathrm{spot}}$ |
| 支撑间距/电极半长/厚度 | $L,a,t$ | **$20/10/0.5$** | $\text{mm}$ | — |
| 表面形变势 | $\varphi$ | **$6\sim10$（区间）** | $\text{eV}$ | 无一手出处；**模型中唯一可调参数**，须如实声明 |
| 暗态内建电势 | $\phi$ | **$0.246$** | $\text{V}$ | 实测活化能法；$1.05\ \text{eV}$ 作废（Schottky-Mott 差值，硅有费米钉扎） |

---

## 三、模型主方程（统一记号版）

### 3.1 光生载流子产生

$$
\Phi_{\mathrm{ph}}=\frac{I_{\mathrm{light}}}{h\nu}\ \big[\text{photons}\cdot\text{cm}^{-2}\text{s}^{-1}\big],\qquad
G=(1-R_{\mathrm{f}})\alpha\,\Phi_{\mathrm{ph}}\ \big[\text{cm}^{-3}\text{s}^{-1}\big] \tag{a}
$$

### 3.2 复合平衡 —— 本样品为纯俄歇极限

三条通道：

$$
G=\underbrace{\frac{\Delta n}{\tau_{\mathrm{eff}}}}_{\text{SRH（可忽略）}}+\underbrace{C_{A}\Delta n^{3}}_{\text{主导}}+\underbrace{B(\Delta n)^{2}}_{\text{不主导}} \tag{b0}
$$

**判定**：未掺杂 FZ 硅体缺陷极少，$\tau_{\mathrm{eff}}$ 由表面复合限制而达 $\sim5\ \text{ms}$；交叉浓度 $\Delta n_c=1/\sqrt{C_A\tau_{\mathrm{eff}}}\approx1.4\times10^{16}\ \text{cm}^{-3}$ 对应光强 $I_c\approx1.7\times10^{-5}\ \text{W}/\text{cm}^{2}$，比实测下限低**五个**数量级。**全部实测点都处于俄歇主导区，式 (b0) 的 SRH 项可删。**

$$
\boxed{\ \Delta n=\left(\frac{G}{C_{A}}\right)^{1/3}=1.0\times10^{10}\,G^{1/3}\ \propto I_{\mathrm{light}}^{1/3}\ } \tag{b}
$$

| $I_{\mathrm{light}}$ ($\text{W}/\text{cm}^{2}$) | $G$ ($\text{cm}^{-3}\text{s}^{-1}$) | $\Delta n$ ($\text{cm}^{-3}$) |
|---|---|---|
| 4.49 | $7.5\times10^{23}$ | $9.1\times10^{17}$ |
| 81.7 | $1.4\times10^{25}$ | $2.4\times10^{18}$ |

**$\Delta n$ 与 $\tau_{\mathrm{eff}}$ 无关**：取 $10\ \mu\text{s}$、$1\ \text{ms}$ 或 $5\ \text{ms}$，上表末列变化在 5% 以内（$10\ \mu\text{s}$ 时下限点的俄歇/SRH 比约 8:1）。$\tau_{\mathrm{eff}}$ 只通过 $L_{d}$ 进入空间分布，不进式 (b)。

### 3.3 准费米能级分裂与能带 —— **耗尽近似在此失效**

$$
\Delta\phi=-\frac{k_{B}T}{q}\ln\!\Big(1+\frac{\Delta n}{n_{0}}\Big),\qquad
\phi_{\mathrm{eff}}=\phi+\Delta\phi \tag{c}
$$

未掺杂材料 $n_{0}\approx n_{i}=1.5\times10^{10}\ \text{cm}^{-3}$ 极小，没有掺杂来钉住能带弯曲，因此准费米能级分裂在极弱光下就吃光全部内建电势：

| $I_{\mathrm{light}}$ ($\text{W}/\text{cm}^{2}$) | $\Delta n/n_{0}$ | $\Delta\phi$ ($\text{V}$) | $\phi_{\mathrm{eff}}$ ($\text{V}$) |
|---|---|---|---|
| 4.49 | $6.1\times10^{7}$ | $-0.463$ | $-0.217$ |
| 81.7 | $1.6\times10^{8}$ | $-0.488$ | $-0.242$ |

平带条件 $\phi_{\mathrm{eff}}=0$ 对应 $\Delta n=2.0\times10^{14}\ \text{cm}^{-3}$、$I_{\mathrm{light}}\approx5\times10^{-11}\ \text{W}/\text{cm}^{2}$，**比实测下限低 11 个数量级**。

### 3.4 耗尽近似公式 —— 全部实测点失效

$$
W=\sqrt{\frac{2\epsilon_{0}\epsilon_{r}\,\phi_{\mathrm{eff}}}{q\,N_{\mathrm{eff}}}}\ \big[\text{cm}\big] \tag{d}
$$

$$
\mu_{\mathrm{eff}}=\frac{\partial\sigma_{s}}{\partial\big(\partial\epsilon_{11}/\partial x_{3}\big)}
=\sqrt{\frac{q\,\epsilon_{0}\epsilon_{r}\,N_{\mathrm{eff}}}{2\,\phi_{\mathrm{eff}}}}\;\frac{\varphi\,t}{2}\ \big[\text{C}/\text{m}\big] \tag{e}
$$

式 (e) 是 Lv 2025 Eq.(1) 的量纲正确形式（原刊 $\mu_{13}^{\mathrm{eff}}=\sqrt{N\epsilon_{0}\epsilon_{r}/2\phi}\cdot q\varphi/2$ 少一个根号内的 $q$）。

**但式 (d)(e) 在本工作中不可用。** 理由：$\phi_{\mathrm{eff}}<0$ 出现在**每一个**实测点（§3.3 表），根号内为负，$W$ 无物理意义。根源是未掺杂高阻硅没有掺杂浓度来维持耗尽区，光一照就平带。式中把 $N_{\mathrm{eff}}=n_{0}+\Delta n$ 代入 $N_{\mathrm D}$ 的位置，也是本模型的假设而非文献结果，正文须显式声明。

**替代方案（§八 唯一待办）**：改用精确 Poisson–Boltzmann（Gummel）解求 $\sigma_{s}(\psi_{s})$，再由 $\mu_{\mathrm{eff}}=\big[\partial\sigma_{s}/\partial(\partial\epsilon_{11}/\partial x_{3})\big]\cdot\varphi t/2$ 得到 $\mu_{\mathrm{eff}}$。须注意：暗态平衡能带弯曲由 $N_{\mathrm D}$ 支撑，不能只保留注入贡献项；高注入下势垒高度 $\Phi_{B}$ 不再决定空间电荷，$\sigma_{s}$ 由界面准费米能级决定——这本身是可用来解释 $\mu_{\mathrm{eff}}$ 饱和的物理机制。

---

## 四、代码变量命名规范

后缀即单位：`_cm3` `_cm` `_cm2s` `_cm6s` `_eV` `_V` `_J` `_m` `_mm` `_ms` `_Wcm2` `_nCm`。跨脚本同义变量必须同名。

| 概念 | **统一变量名** | 需改的旧写法 |
| --- | --- | --- |
| $n_{i}$ | `ni_cm3` | `n0_cm3`、`n0`、`ni` |
| $N_{\mathrm{D}}$ | `nd_cm3` | 缺失 |
| $n_{0}$ | `n0_cm3` | — |
| $\Delta n$ | `dn_cm3` | `DeltaN_cm3`、`dN_cm3` |
| $N_{\mathrm{eff}}$ | `n_eff_cm3` | `N_total_cm3` |
| $G$ | `G_cm3s` | `G` |
| $I_{\mathrm{light}}$ | `I_light_Wcm2` | — |
| $I_{A}$ | `laser_I_A` | 新增 |
| $P_{\mathrm{laser}}$ | `laser_P_mW` | 新增（`$1312\,I_{A}-85.124$`） |
| $A_{\mathrm{spot}}$ | `spot_A_cm2` | 新增（`$\pi w_{0}^{2}$`） |
| $\alpha$ | `alpha_cm` | 值须为 `1.5e5` |
| $R_{\mathrm{f}}$ | `Rf` | `R` |
| $\phi$ | `vbi_V` | `phi_b`（且值改 `0.246`） |
| $\psi_{s}$ | `psi_s_V` | 新增 |
| $\Delta\phi$ | `dphi_V` | `dphi_eV` |
| $\varphi$ | `phi_def_eV` | `phi_d_min`/`phi_d_max` |
| $\tau_{\mathrm{eff}}$ | `tau_eff_s` | `tau` |
| $D_{a}$ | `Da_cm2s` | 新增（`18.3`，不再用 `Dp_cm2s` 做扩散） |
| $L_{d}$ | `Ld_cm` | `L` |
| $W$ | `W_cm` | `d_mm` |
| $d_{\mathrm{spot}}$ | `spot_d_mm` | `d_mm` |
| $\mu_{\mathrm{eff}}$ | `mu_eff_nCm` | — |

坐标一律 $x_{1}$（长 $22\ \text{mm}$）/$x_{2}$（宽 $4\ \text{mm}$，激光传播）/$x_{3}$（厚 $0.5\ \text{mm}$）。`_光生载流子空间分布理论/` 脚本里的 `x/y/z` 对应 $x_{1}/x_{2}/x_{3}$，报告文字与正文图注改用 $x_{2},x_{3}$。

---

## 五、已发现的冲突与判定

前 16 条为已裁决的历史冲突，保留作为查账依据；第 12、16 条已在本轮结案（见条目内标注）。第 17–21 条为本轮新发现。

1. **$n_{i}$ 两套值**：`_光生载流子空间分布理论/`（`params_estimate.py:15`、`average_calc.py:15`、报告 L148/L223）用 $9.65\times10^{9}\ \text{cm}^{-3}$，其余（`光挠曲电理论计算.py:75`、SRH 对比脚本、SRH 推导文档）用 $1.5\times10^{10}\ \text{cm}^{-3}$。**定 $1.5\times10^{10}$**，报告里跟着改：$N_{\mathrm{D}}$ 不再是 $n_{i}$ 的"50 倍"而是 **$31$ 倍**；体积平均不再是 $2.1\times10^{5}$ 倍而是 **$1.36\times10^{5}$**；局部峰值不再是 $3.4\times10^{7}$ 倍而是 **$2.1\times10^{7}$**（README L49–50 同改）。
2. **$\Delta n$ vs $\Delta N$**：均匀体模型链（中期报告、SRH 文档、脚本）用 $\Delta N$，空间分布模型用 $\Delta n$。**定 $\Delta n$**；SRH 文档 L4 的"记号对应"表作废。
3. **$G$ 一名两职**：中期报告式(4) 用 $G$ 表示曲率/应变梯度，SRH 文档与全部脚本用 $G$ 表示产生率。**定 $G$=产生率，曲率=$\kappa$，应变梯度=$\partial\epsilon_{11}/\partial x_{3}$**。
4. **$L$ 一名两职**：补充材料式(S1) 的 $L$=支撑间距 $20\ \text{mm}$，空间分布报告的 $L$=扩散长度。**定 $L$=支撑间距，扩散长度=$L_{d}$**。
5. **$R$ 一名两职**：$R$=反射率（空间分布）与 $R$=复合率（SRH 文档式(8)、旧模型 $R_{r}$）。**定 $R_{\mathrm{f}}$=反射率，$R$=复合率**。
6. **$P$ 一名三职**：SRH 文档 §2 用 $P$=光功率密度，补充材料用 $P_{3}$=极化，空间分布报告用 $P$=激光功率（$80\ \text{mW}$）。**定 $I_{\mathrm{light}}$=光功率密度、$P_{3}$=极化、$P_{\mathrm{laser}}$=激光功率**（本轮进一步分出 $I_{A}$=激光电流，见 §17）。
7. **$\phi$/$\varphi$/$\Phi$ 混用**：中期式(12) 把势垒高度与形变势写反；$\Phi$ 又同时是光子通量与面注入通量。**定 $\Phi_{B}$($\text{eV}$)=势垒高度、$\phi$($\text{V}$)=暗态内建电势、$\varphi$($\text{eV}$)=形变势、$\Phi_{\mathrm{ph}}$/$\Phi_{\mathrm{gen}}$ 带下标**。本轮新增 $\psi_{s}$=表面电势，见 §21。
8. **$n_{0}$/$N_{0}$/$N$ 混用**：中期式(6)(7) 分母写 $N_{0}$，紧接的正文却说 $n_{0}$；而耗尽公式里的 $N$ 物理上应是 $N_{\mathrm D}$，模型假设用 $n_{0}+\Delta n$。**定 $n_{0}$=暗态浓度、$N_{\mathrm{D}}$=电离掺杂、$N_{\mathrm{eff}}=n_{0}+\Delta n$**，并在正文一句话说明"$N_{\mathrm{eff}}$ 替代 $N_{\mathrm{D}}$ 是本模型的假设"。`存在的问题.md:49` 的"全耗尽"结论用的是 $N_{0}=1.5\times10^{10}\ \text{cm}^{-3}$，那是 $n_{i}$ 不是掺杂，应按 $N_{\mathrm{D}}=4.6\times10^{11}\ \text{cm}^{-3}$ 重算 $W$。**本轮补充**：样品为未掺杂材料，$n_{0}\approx n_{i}$ 才是物理图像，$N_{\mathrm{eff}}$ 替代 $N_{\mathrm{D}}$ 带来的偏差因此更大（$N_{\mathrm{eff}}/N_{\mathrm D}$ 达 $10^{7}$ 量级），这正是 §21 的根源。
9. **$d$ 一名三职**：势垒层宽度（中期式5）、光斑直径（`d_mm`）、微分号。**定 $W$=势垒层宽度、$d_{\mathrm{spot}}$=光斑直径**。
10. **$\beta$ 是冗余参数**：$\beta=1$ 且反射已用 $(1-R_{\mathrm{f}})$ 表达。**删 $\beta$**，$G=(1-R_{\mathrm{f}})\alpha\Phi_{\mathrm{ph}}$。
11. **峰值浓度两处不一致**：空间分布报告 §6.3 给 $3.2\times10^{17}\ \text{cm}^{-3}$，同目录 README L48 给 $2.0\times10^{17}\ \text{cm}^{-3}$。以脚本重跑结果为准（**注意：该结果按 $80\ \text{mW}$ 算，等价 $18\ \text{W}/\text{cm}^{2}$，落在新的实测区间外，见 §17**）。
12. **$\tau_{\mathrm{eff}}$ 差 $100$ 倍 —— ✅ 本轮结案**：`_光生载流子空间分布理论/` 用 $1\ \text{ms}$（README L41、报告 §5），`SRH俄歇模型对比/对比_双分子vsSRH俄歇.py` 用 $10\ \mu\text{s}$（且 SRH 文档 §7 推荐 $1\sim100\ \mu\text{s}$）。**这是物理分歧，不是记号问题。** 结论：FZ 未掺杂样品体缺陷极少，$\tau_{\mathrm{eff}}$ 由表面复合限制达 $\sim5\ \text{ms}$；实测区间全部落在俄歇主导区，$\Delta n\propto I^{1/3}$，$\tau$ 不进式 (b)（见 §19）。**结论是两者都对，只是各管一段物理**——$10\ \mu\text{s}$ 那张图讲低注入极限，$5\ \text{ms}$ 讲实际样品。旧图不得与新结果同图比较。
13. **`r_cm3 = 1e-10`**：旧双分子复合系数，比硅的 $B$（$4.7\times10^{-15}\ \text{cm}^{3}\text{s}^{-1}$）大 $4.5$ 个量级，实为拟合值。**弃用 $r$**，改用 $B$（辐射）、$\tau_{\mathrm{eff}}$（SRH）、$C_{A}$（俄歇）。
14. **LaTeX 写法**：`${\mu}_{\mathrm{e}\mathrm{f}\mathrm{f}}$`（AGENTS.md、中期报告）与 `\mu_{\text{eff}}`（正文/补充材料）与 `\mu_{\rm eff}`（脚本）并存。**统一定为 `$\mu_{\mathrm{eff}}$`**（AGENTS.md L13 需同步更新）。
15. **中文术语**：同一文档里"等效挠曲电系数"与"有效挠曲电系数"混用（中期报告 §三标题用"有效"）。**定"等效挠曲电系数"**（对应符号 $\mu_{\mathrm{eff}}$，"eff" 是 effective coefficient 的缩写）。**注意**：脚本变量名 `mu_eff` 保持不变，变量名是缩写不是术语翻译。
16. **$80\ \text{mW}$ 与 $80\ \text{W}/\text{cm}^{2}$ 不能同时成立 —— ✅ 本轮结案**：见 §17。结论是 `_光生载流子空间分布理论/` 全程按 $80\ \text{mW}$ 计算（$G_{\mathrm{tot}}=8.97\times10^{16}\ \text{s}^{-1}$ 与之自洽），等价 $18\ \text{W}/\text{cm}^{2}$，**落在新实测区间 $[4.49,\ 81.7]\ \text{W}/\text{cm}^{2}$ 之外**，因此该目录下的 $\Delta n$ 空间分布图不能直接进正文。
17. **激光标定与光强区间（本轮定案）**：实测标定 $P_{\mathrm{laser}}(\text{mW})=1312I_{A}(\text{A})-85.124$，工作区间 $I_{A}\in[0.08,\ 0.34]\ \text{A}$，低于 $0.08\ \text{A}$ 为暗态。对应 $P_{\mathrm{laser}}\in[19.8,\ 361]\ \text{mW}$。光斑为**直径** $d_{\mathrm{spot}}=0.75\ \text{mm}$（$w_{0}=375\ \mu\text{m}$，$A_{\mathrm{spot}}=\pi w_{0}^{2}=4.418\times10^{-3}\ \text{cm}^{2}$），故 $I_{\mathrm{light}}\in[4.49,\ 81.7]\ \text{W}/\text{cm}^{2}$。**旧值作废**：正文"$0$–$80\ \text{W}/\text{cm}^{2}$"（$0$ 属暗态，不是连续变量）与"$80\ \text{mW}\leftrightarrow18\ \text{W}/\text{cm}^{2}$"。新写法为"$4.5$–$82\ \text{W}/\text{cm}^{2}$"。
18. **光斑半径还是直径（本轮定案）**：曾出现"$d_{\mathrm{spot}}=0.75\ \text{mm}$ 为直径"与"激光半径 $=0.75\ \text{mm}$"两种说法，相差 4 倍。**确认为直径**，$w_{0}=375\ \mu\text{m}$。此值直接决定 $A_{\mathrm{spot}}$ 与 mW↔$\text{W}/\text{cm}^{2}$ 换算，是 §17 的前提。
19. **SRH 项是否可忽略（本轮定案）**：FZ 未掺杂、体缺陷少（密度低达 $10^{11}\ \text{cm}^{-3}$），故 SRH 速率小；$\tau_{\mathrm{eff}}$ 由表面复合限制（双面抛光，$S\approx5\ \text{cm/s}$，$\tau=t/2S\approx5\ \text{ms}$）。交叉浓度 $\Delta n_c=1/\sqrt{C_A\tau_{\mathrm{eff}}}\approx1.4\times10^{16}\ \text{cm}^{-3}$ 对应 $I_c\approx1.7\times10^{-5}\ \text{W}/\text{cm}^{2}$，比实测下限低**五个**数量级。**定：本体系为纯俄歇极限**，式 (b0) 的 SRH 项删去，$\Delta n=(G/C_A)^{1/3}=1.0\times10^{10}G^{1/3}\propto I_{\mathrm{light}}^{1/3}$。$\Delta n$ 与 $\tau_{\mathrm{eff}}$ 无关（$10\ \mu\text{s}$~$5\ \text{ms}$ 变化 $<5\%$）；$\tau$ 只经 $L_d$ 进入空间分布。$L_{d}$ 用双极扩散系数 $D_{a}=2D_{n}D_{p}/(D_{n}+D_{p})=18.3\ \text{cm}^{2}\text{s}^{-1}$，得 $L_{d}\approx3.0\ \text{mm}\gg t=0.5\ \text{mm}$。
20. **耗尽近似的适用边界（本轮发现）**：耗尽近似成立需 $\phi_{\mathrm{eff}}>0$ 且 $W\gg L_{D}$。本样品 $n_{0}\approx n_{i}=1.5\times10^{10}\ \text{cm}^{-3}$ 极小，$\Delta\phi=-\frac{k_BT}{q}\ln(1+\Delta n/n_{0})$ 在极弱光下就吃光全部 $\phi$：平带对应 $\Delta n=2.0\times10^{14}\ \text{cm}^{-3}$、$I_{\mathrm{light}}\approx5\times10^{-11}\ \text{W}/\text{cm}^{2}$，比实测下限低 **11 个数量级**。因此 $4.5$–$82\ \text{W}/\text{cm}^{2}$ 全区间落在平带之后，耗尽近似不可用（→ §21）。
21. **$\phi_{\mathrm{eff}}$ 与 $\psi_{s}$ 混用（本轮定案）**：物理上驱动空间电荷的量是界面静电势 $\psi_{s}$（非平衡量），不是 $\phi_{\mathrm{eff}}$（暗态 $\phi$ 加耗尽近似修正的产物）。高注入下 $\phi_{\mathrm{eff}}$ 变负只是耗尽近似失效的**症状**，不是物理量本身；把它当有效量用会导致根号内为负。**定 $\psi_{s}$ 为精确解的边界条件量**，$\phi_{\mathrm{eff}}$ 降格为失效判据（仅保留在 §3.3 用于论证近似失效，不进任何公式）。相应地，$\sigma_{s}$ 由界面准费米能级决定而非 $\Phi_{B}$，暗态平衡能带弯曲仍由 $N_{\mathrm{D}}$ 支撑——精确解必须同时含这两项，不能只保留注入贡献。

---

## 六、关系（当前成立）

- 一次 $405\ \text{nm}$ 照射（$I_{\mathrm{light}}$）经式 (a)(b) 唯一确定一组 $\Delta n$，且 **$\Delta n\propto I_{\mathrm{light}}^{1/3}$**——这是本体系最重要的标度关系，任何偏离都直接否定或修正纯俄歇极限。
- 一个样品（$N_{\mathrm D}$、$\rho$、几何）对应一条 $\mu_{\mathrm{eff}}(I_{\mathrm{light}})$ 曲线；三条曲线来自三个独立样品，不允许分别拟合各自的 $\varphi$。
- **$\Delta n$ 增大 $\Rightarrow$ 表面电势 $|\psi_{s}|$ 增大 $\Rightarrow$ 空间电荷 $\sigma_{s}$ 增大 $\Rightarrow$ $\mu_{\mathrm{eff}}$ 增大，但增益由高注入饱和效应压制**（耗尽近似中表现为 $\phi_{\mathrm{eff}}\to0$ 时的发散，物理上由 $\sigma_{s}$ 的饱和替代）。$\mu_{\mathrm{eff}}$ 的饱和行为可作为纯俄歇极限的独立检验。
- **$\tau_{\mathrm{eff}}$ 与 $D_{a}$ 只通过 $L_{d}=\sqrt{D_{a}\tau_{\mathrm{eff}}}$ 影响空间分布形状，不影响 $\Delta n$ 幅值**；$L$（支撑间距）与它们完全无关。
- **$\Phi_{B}$（势垒高度，$\text{eV}$）与 $\phi$（暗态内建电势，$\text{V}$）都描述 Au/Si 界面，但 $\Phi_{B}$ 不进空间电荷公式**；在 $\phi$ 位置误填 $1.05$ 会让 $W$ 与 $\mu_{\mathrm{eff}}$ 的根号项同时高估约 $\sqrt{1.05/0.246}\approx2.1$ 倍。
- **挠曲光伏效应**与**光挠曲电效应**共享同一批 $\Delta n$ 分布，但前者产出 $V_{oc}/I_{sc}$，后者产出 $\mu_{\mathrm{eff}}$；两个词各指其一，不得互换。

---

## 七、示例对话

> **写稿**：式(b) 里我用 $\Delta N$ 还是 $\Delta n$？空间分布那边已经全是 $\Delta n$ 了。
> **物理**：统一 $\Delta n$，因为 $n$ 就是载流子浓度，$\Delta n$ 是它的增量；$N$ 在我们这套记号里只出现在 $N_{\mathrm{D}}$ 和 $N_{\mathrm{eff}}$，留给"掺杂"和"代入耗尽公式的总量"这两个特定含义。

> **写稿**：那 $\mu_{\mathrm{eff}}$ 公式根号里的 $2\phi$，我填 $1.05$ 还是 $0.246$？单位写 $\text{eV}$ 还是 $\text{V}$？
> **物理**：填 $0.246$，单位 $\text{V}$。$1.05$ 是 $\Phi_{B}$，是势垒高度，量纲是能量；式 (d)(e) 里要的是能带弯曲电势 $\phi$。$q$ 已经在根号里显式写出来了，所以 $\phi$ 必须是 $\text{V}$，不能再偷偷用 $\text{eV}$。

> **写稿**：$\varphi$ 取 $6\sim10\ \text{eV}$ 这个条带，还能说"零自由拟合参数"吗？
> **物理**：不能。$\alpha$、$R_{\mathrm{f}}$、$C_{A}$ 都是选定值。改成"除表面形变势 $\varphi$ 外不引入可调参数"，并把 $\varphi$ 明确标成模型中唯一的可调项及其出处缺口。

> **写稿**：既然样品是 FZ 未掺杂、体缺陷很少，那 SRH 项是不是可以去掉？
> **物理**：可以去掉，但要给数值判据而不是靠"缺陷少"这句话。$\tau_{\mathrm{eff}}$ 在双面抛光样品上由表面复合限制，$\tau=t/2S\approx5\ \text{ms}$，于是 $\Delta n_c=1/\sqrt{C_A\tau_{\mathrm{eff}}}\approx1.4\times10^{16}\ \text{cm}^{-3}$，对应 $I_c\approx1.7\times10^{-5}\ \text{W}/\text{cm}^{2}$。实测下限 $4.49\ \text{W}/\text{cm}^{2}$ 比它高五个数量级，所以全区间俄歇主导，式子化成 $\Delta n=(G/C_A)^{1/3}$。顺便好处是 $\Delta n$ 与 $\tau$ 脱钩，$\tau$ 定错不影响主结果。

> **写稿**：那 $\tau_{\mathrm{eff}}$ 我到底填多少？$1\ \text{ms}$ 还是 $5\ \text{ms}$？
> **物理**：这个选择只影响 $L_{d}$，而 $L_{d}\approx3.0\ \text{mm}\gg t=0.5\ \text{mm}$，两种取法下横向输运都不受限，$L_{d}$ 的绝对值对你现在的模型没有判别力。所以别在它上面耗时间——留 $5\ \text{ms}$（与表面复合的物理一致），等做 $\mu$-PCD 再说。

> **写稿**：图 6 里我想把 $10\ \mu\text{s}$ 和 $1\ \text{ms}$ 两条 $\Delta n$ 曲线画在一起对比。
> **物理**：别。两者说的不是同一个 $\tau_{\mathrm{eff}}$，交叉浓度 $\Delta n_{c}$ 会差一个数量级、俄歇是否参与直接变向。要么同一张图里只留一个中心值加区间，要么分开画并各自标注 $\tau_{\mathrm{eff}}$。

> **写稿**：我把 $80\ \text{mW}$ 那批 $\Delta n$ 空间分布图放进正文行不行？反正峰值量级是对的。
> **物理**：不行。那批结果对应 $18\ \text{W}/\text{cm}^{2}$，在你的实测区间 $[4.49,\ 81.7]$ 之外。要进正文得按 $P=1312I_A-85.124$ 重跑 `updated_model.py`/`xy_map.py`/`average_calc.py`。

> **写稿**：$\phi_{\mathrm{eff}}$ 算出来是 $-0.22\ \text{V}$，$W$ 开根号报错。是不是哪里写错了？
> **物理**：不是 bug，是模型失效。因为 $n_0\approx n_i=1.5\times10^{10}$ 太小，没有掺杂来钉住能带弯曲，平带只对应 $5\times10^{-11}\ \text{W}/\text{cm}^{2}$——你的每一个数据点都在平带之后。耗尽近似在这里根本不成立，必须换精确 Poisson–Boltzmann 解。注意方向：$\Delta n$ 越大 $\phi_{\mathrm{eff}}$ 越小，可它不是真实电势，别拿它算任何东西。

---

## 八、当前唯一待办

**耗尽近似的替换。** 式 (d)(e) 在全部实测点因 $\phi_{\mathrm{eff}}<0$ 而失效（§3.3、§3.4）。需要：

1. 用精确 Poisson–Boltzmann（Gummel）数值解求 $\sigma_{s}(\psi_{s})$，边界条件含暗态平衡能带弯曲（由 $N_{\mathrm D}$ 支撑）与表面注入水平（由 $I_{\mathrm{light}}$ 决定）；
2. 由 $\mu_{\mathrm{eff}}=\big[\partial\sigma_{s}/\partial(\partial\epsilon_{11}/\partial x_{3})\big]\cdot\varphi t/2$ 重建 $\mu_{\mathrm{eff}}(I_{\mathrm{light}})$；
3. 用实测 $\mu_{\mathrm{eff}}$ 数据检验重建曲线，据此定 $\varphi$——**$\varphi$ 目前无一手出处（Balslev/Hall 未给数值），重建完成后可由数据反解，成为模型输出而非输入**。

**"零自由拟合参数"的说法当前不成立**：$\alpha$、$R_{\mathrm f}$、$C_{A}$ 均为选定值，$\varphi$ 更是一手出处缺失。行文改为"除表面形变势 $\varphi$ 外不引入可调参数"，并把 $\varphi$ 标为模型中唯一的可调项及其出处缺口。$\alpha$ 与 $R_{\mathrm f}$ 若取得椭偏/反射谱实测值则同步替换（当前敏感性区间 $(0.8\sim1.5)\times10^{5}\ \text{cm}^{-1}$ 与 $0.42\sim0.48$）。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'ubiquitous-language',
'test',
'Ubiquitous Language —— 硅光挠曲电统一记号表',
'2026-08-20',
NULL,
NULL,
NULL,
NULL
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;

-- why-blog-again

DELETE FROM post_parts WHERE slug = 'why-blog-again';

INSERT INTO post_parts (slug, kind, idx, body) VALUES ('why-blog-again', 'md', 0, '
收藏夹越来越厚，写出来的东西越来越少。这是决定重新开一个博客的直接原因。

## 输出是整理

读过的东西如果不落成文字，一个月后只剩一个模糊的印象：「好像在哪看过」。写下来的过程会强迫你把模糊的地方补清楚——写不清楚，就是没读懂。

## 这个站本身也是练习

你正在看的这个站点，是一次前端动效的练习：

- 惯性平滑滚动
- 横向滑动的精选展区
- 随滚动绘制的曲线
- 图片的虚化与呼吸缩放

后面每做好一个效果，都会写一篇拆解。');

INSERT INTO posts (slug, column_slug, title, date, updated, cover, handwritten, depth)
VALUES (
'why-blog-again',
'test',
'为什么我又开始写博客了',
'2026-10-02',
NULL,
'/img/p1.jpg',
NULL,
'/img/p1-depth.webp'
) ON CONFLICT(slug) DO UPDATE SET
  column_slug = excluded.column_slug, title = excluded.title, date = excluded.date,
  updated = excluded.updated, cover = excluded.cover, handwritten = excluded.handwritten,
  depth = excluded.depth;