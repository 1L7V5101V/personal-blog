---
title: 把 Lusion 的滑动效果拆开看
date: 2026-10-01
tag: 前端
cover: /img/p2.jpg
depth: /img/p2-depth.webp
---

Lusion 的网站看起来玄，拆开全是基础功。

## 幕帘展开

图片进场不是淡入，而是 `clip-path: inset()` 从一侧收拢到展开——像窗帘拉开。配上 `cubic-bezier(0.22, 1, 0.36, 1)` 这种长尾缓动，就有「贵」的感觉。

## 滚动缩放

元素随它在视口中的位置在 0.92 到 1.0 之间插值缩放，只动 `transform`，合成器友好，60fps 无压力。

## 线条描绘

SVG path 设 `pathLength="1"`，把 `stroke-dashoffset` 从 1 减到 0，滚动进度直接映射过去——滚多少画多少，往回滚会倒着擦掉。

## 总结

没有黑魔法，只有克制：每处动效只服务一个目的，慢缓动 + 少量位移 = 高级感。
