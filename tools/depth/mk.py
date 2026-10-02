"""一次性离线工具：用 Depth Anything V2 (onnx, Apache-2.0) 给封面图生成深度图。
输出灰度 webp（亮 = 近），供首页图片卡的 WebGL 视差着色器使用。
用法: python mk.py <cover.jpg> <out.webp> [...]
"""
import json, os, sys
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
pre = json.load(open(os.path.join(HERE, 'preprocessor_config.json'), encoding='utf-8'))
MEAN = np.array(pre['image_mean'], np.float32).reshape(3, 1, 1)
STD = np.array(pre['image_std'], np.float32).reshape(3, 1, 1)
SIZE = pre['size']['height']          # 518
DIV = pre['ensure_multiple_of']       # 14

sess = ort.InferenceSession(os.path.join(HERE, 'model.onnx'), providers=['CPUExecutionProvider'])
IN = sess.get_inputs()[0]
print('input', IN.name, IN.shape, '| outputs', [(o.name, o.shape) for o in sess.get_outputs()], flush=True)


def fit(im):
    """短边缩到 518、比例保持、边长取 14 的倍数（对齐官方 preprocessor）。"""
    w, h = im.size
    s = SIZE / min(w, h)
    nw = max(DIV, int(round(w * s / DIV)) * DIV)
    nh = max(DIV, int(round(h * s / DIV)) * DIV)
    return im.resize((nw, nh), Image.BICUBIC)


def depth(src, dst, out_w=512):
    im = Image.open(src).convert('RGB')
    x = np.asarray(fit(im), np.float32).transpose(2, 0, 1)[None] / 255.0
    y = sess.run(None, {IN.name: (x - MEAN) / STD})[0]
    d = np.asarray(y, np.float32).squeeze()
    d = (d - d.min()) / (d.max() - d.min() + 1e-8)          # 归一化到 0..1（亮 = 近）
    h = max(2, round(out_w * im.size[1] / im.size[0]))
    dim = Image.fromarray((d * 255).astype(np.uint8)).resize((out_w, h), Image.BICUBIC)
    dim = dim.filter(ImageFilter.GaussianBlur(1.1))          # 抹掉网络噪声，视差更顺
    dim.save(dst, quality=92, method=6)
    print(f'  {dst}  {dim.size}  {os.path.getsize(dst)/1024:.1f} KB', flush=True)


for i in range(1, len(sys.argv), 2):
    depth(sys.argv[i], sys.argv[i + 1])
