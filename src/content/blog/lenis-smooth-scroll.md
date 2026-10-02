---
title: 惯性滚动的手感是怎么调出来的
date: 2026-09-15
tag: 前端
cover: /img/p4.jpg
---

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

`lerp` 越小越「漂」，越大越「跟手」。0.1 左右是那种「页面有重量」的感觉，再小就开始晕车了。
