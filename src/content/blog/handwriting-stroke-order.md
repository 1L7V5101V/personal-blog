---
title: 让字体自己写出笔顺
date: 2026-10-03
column: test
handwritten: Handwriting, not typing.
---

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
  time={{ mode: 'uncontrolled', speed: 5 }}
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
动和不动的信息量是一样的 —— tegaki 的 `reducedMotion="user"` 会直接把成品画出来。