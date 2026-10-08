---
title: "GLSL 入门笔记：从一张渐变开始"
date: 2026-09-20
column: test
cover: /img/p3.jpg
depth: /img/p3-depth.webp
---

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

心电图的 QRS 波，无非是把正弦换成几个精心摆放的折线段。
