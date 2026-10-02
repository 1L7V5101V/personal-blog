# tools/depth — 封面深度图（离线一次性工具）

首页图片卡的鼠标视差靠一张灰度深度图（**亮 = 近**，与封面同尺寸同构图）。
本目录脚本用 **Depth Anything V2**（`onnx-community/depth-anything-v2-small`，Apache-2.0）
从封面图生成 `public/img/p*-depth.webp`（512 宽，约 3~5 KB）。

## 跑一次

```bash
cd tools/depth
python -m venv venv && ./venv/Scripts/python -m pip install onnxruntime numpy pillow
# 模型（约 99 MB）不进仓库，按 .gitignore 忽略：
M=https://hf-mirror.com/onnx-community/depth-anything-v2-small/resolve/main
curl -L -o model.onnx $M/onnx/model.onnx
curl -L -o preprocessor_config.json $M/preprocessor_config.json
./venv/Scripts/python mk.py ../../public/img/p1.jpg ../../public/img/p1-depth.webp
```

huggingface.co 直连不通，走 `hf-mirror.com` 镜像（同一个仓库、同一份文件）。

## 新文章要加视差

1. `python mk.py public/img/新封面.jpg public/img/新封面-depth.webp`
2. 在文章 frontmatter 加 `depth: /img/新封面-depth.webp`
   —— **同时**要在 `src/content.config.ts` 的 schema 里声明 `depth`，
   否则普通 `z.object` 会把没声明的字段静默丢掉（页面会安静地没有画布，不报错）。
3. 没写 `depth` 的封面自动退回普通 `<img>`，不报错。
