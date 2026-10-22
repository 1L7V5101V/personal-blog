/**
 * CRT 卡：首页轨道里那块真的在放信号的玻璃。
 * 内容是 David A Roberts 在 shadertoy 上那支 CRT 演示（XtlSD7 的显示器外壳 + 五个图案轮播）。
 *
 * 为什么要拆成两趟着色器，而不是照抄原版的 AA=4 超采样循环：
 * 原版的循环是「每个屏幕像素采 16 次」，而这张卡有 min(75vw,76rem) × 9/16 ≈ 1000×570 css 像素，
 * 照搬就是每帧 920 万次、每次几十个超越函数的采样，且这段开销全落在滚动手势期间
 * ——那条路上还要同时跑 11 条切片的弯牌。拆开之后：
 *   第一趟 图案（贵）：算在 480×270 的小缓冲里，13 万次，一次一采样；
 *   第二趟 外壳（便宜）：按卡的真实像素算曲率 / 暗角 / 扫描线 / 荫罩，每像素一次纹理读取。
 * 原版那个 16× 超采样本来只干三件事：糊掉管口硬边、把扫描线平均到亚像素、把量化块平均掉。
 * 分趟之后第一件改成 1.5px 的 smoothstep，后两件不存在了（扫描线是逐像素解析式，
 * 量化块就在小缓冲里，本来就是块）。
 *
 * 静止兜底（移动端 / reduced-motion / 没有 WebGL2 / 弯牌切片期间）不在这里，在 CSS：
 * `.crtcard` 自己的 background-image 就是一张「没信号的屏」，和切片期间露出来的那张是同一张。
 */

// 信号缓冲固定 1280×720 —— 就是原版那台屏的设计分辨率，不是按卡大小算出来的。
// 两个理由：
// ① 欠采样。图案里有 sin(80*p.x) 这种高频项，p 横跨 50 单位 → 一屏 266 个周期。
//    480 宽时 1.8px 一个周期，早就过了奈奎斯特，画出来是一团噪点（实测过）；
//    720p 下 4.8px 一个周期，和原版同一档。
// ② 原版的量化爬坡公式里那个 iResolution.y 就是 720，钉死之后块大小（t=0 时 14px、
//    t=2 时亚像素）和超采样条数都回到原式，不需要再折算。
// 卡比它小就是降采样（双线性顺带替掉了原版那 16 次超采样），卡比它大也只是轻微发软 —— 本来就在演显像管。
const SIGNAL_W = 1280;
const SIGNAL_H = 720;
const MIN_DT = 1000 / 30;   // 30fps 上限：扫描线漂移折算到屏上约 3.4px/s，30fps 每帧才挪 0.11px

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** 第一趟：信号。纹理坐标就是原版过了曲率、落在 [0,1]² 里的那块 uv */
const SIGNAL_FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;

#define PI 3.141592653589793
// 原版这里写的是 float(AA)（超采样次数）。分趟之后它只剩「量化爬坡要爬多高」的含义，
// 留在 4 是有依据的：t=0 时量化块 ≈ 17 屏上像素（原版 720p 下 14），t=2 时降到亚像素
// （量化消失），和原版同一行为。
#define AA 4.

float atanp(in vec2 p) { return atan(p.y, p.x); }
float cube_root(float x) { return sign(x) * pow(abs(x), 1. / 3.); }
float sq(float x) { return x * x; }

vec3 margarita(in vec2 p) {
    float z = length(p) - 3.5 * atanp(p) + sin(p.x) + cos(p.y);
    if (mod(z, 7. * PI) < PI / 2.) return vec3(1, 0, 0);
    if (mod(z, 1. * PI) < PI / 2.) return vec3(0);
    return vec3(1);
}

vec3 digital_bacteria(in vec2 p) {
    p /= 4.;
    float x = sq(sin(p.x) + p.y) + sq(cos(p.y) + p.x);
    float y = cos(10. * p.x) + cos(10. * p.y) - sin(p.x * p.y);
    float z = sq(sin(floor(p.x)) + floor(p.y)) + sq(cos(floor(p.y)) + floor(p.x));
    if (17. < x && x < 21. && 17. < z && z < 21. && y < 0.)
        return vec3(1., 1., 85. / 256.);
    if (17. < z && z < 21.) return vec3(85. / 256., 0., 0.);
    if (17. < x && x < 21.) return vec3(170. / 256., 170. / 256., 0.);
    return vec3(85. / 256., 85. / 256., 0.);
}

vec3 threesome(in vec2 p) {
    p /= 3.;
    float z = 1.;
    z *= sin(length(p + vec2(5, 0))) * cos(8. * atanp(p + vec2(5, 0)));
    z *= sin(length(p - vec2(5, 5))) * cos(8. * atanp(p - vec2(5, 5)));
    z *= sin(length(p + vec2(0, 5))) * cos(8. * atanp(p + vec2(0, 5)));
    if (-0.1 < z && z < 0. || 0.2 < z) return vec3(0);
    return vec3(1);
}

vec3 plaid_meltdown(in vec2 p) {
    p /= 15.;
    p += 7.;
    float a = 2. * sin(p.x * sin(p.y) + p.y * sin(p.x));
    float b = cube_root(sin(2.5 * sqrt(2.) * (p.x - p.y)));
    float c = cube_root(sin(2.5 * sqrt(2.) * (p.x + p.y)));
    float d = sin(80. * p.x) + sin(80. * p.y);
    if (0.25 * (a + b + c) > 0.5 * d) return vec3(0);
    return vec3(1);
}

vec3 sunlight_revealed(in vec2 p) {
    p /= 6.;
    p.x += 2.;
    float a = length(vec2(3. - p.x, p.y)) + abs(p.y) + abs(1. - p.x);
    float f = atan(p.y, p.x - 1.);
    float c = atan(p.y, p.x - 3.);
    float R = sq(p.x - 1.) + sq(p.y);
    vec3 col = vec3(0);
    // 原版这个变量叫 mix，和 GLSL 内置函数同名：ANGLE / SwiftShader 直接拒绝编译，
    // 就算放过也挡住后面真 mix() 的重载解析。
    bool layered = false;
    if (5. < a && a < 7. && mod(f, PI / 7.) < PI / 14.) {
        col += vec3(0., 82. / 256., 173. / 256.);
        if (layered) col /= 2.;
        layered = true;
    }
    if (5. < a && a < 7. && mod(c, PI / 9.) < PI / 18.) {
        col += vec3(1, 0, 0);
        if (layered) col /= 2.;
        layered = true;
    }
    if (5. < a && a < 7. && mod(f, PI / 8.) < PI / 16.) {
        col += vec3(1, 1, 0);
        if (layered) col /= 2.;
        layered = true;
    }
    if ((45. - 3. * p.x) * PI / 180. < f && f < (47. - p.x) * PI / 180. && p.y > 0.1 * p.x
        && mod(log(R) / log(f), 2.) < 1.) {
        col += vec3(1);
        if (layered) col /= 2.;
    }
    return col;
}

vec3 pattern(vec2 p) {
    float sel = mod(0.1 * uTime, 5.);
    if (sel < 1.) return margarita(p);
    if (sel < 2.) return plaid_meltdown(p);
    if (sel < 3.) return sunlight_revealed(p);
    if (sel < 4.) return threesome(p);
    return digital_bacteria(p);
}

void main() {
    float t = mod(uTime, 10.);
    vec2 p = 50. * (gl_FragCoord.xy / uRes) - 25.;
    p *= 0.75 + 0.05 * t;
    p += t - 5.;
    p.x *= uRes.x / uRes.y;   // 小缓冲与卡面同为 16:9，这条长宽比就是原版那条
    if (t < 2. || t > 8.) {
        float fade = smoothstep(0., 2., t) - smoothstep(8., 10., t);
        float scale = uRes.y / 50. * AA * fade + 1.;
        p = floor(p * scale) / scale;
    }
    fragColor = vec4(pattern(p), 1.);
}`;

/** 第二趟：显示器外壳。曲率 + 暗角 + 扫描线 + 荫罩，按卡的真实像素算 */
const CRT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSignal;
uniform vec2 uRes;
uniform float uTime;

// 玻璃外面那一圈机身 = --ink-black #14181a，比画布黑（--bg #0b0b0c）亮一档。
// 原版管外是纯黑：满屏时那是屏幕外的房间，落到黑场里的一张卡上就变成一个洞。
const vec3 BEZEL = vec3(0.078, 0.094, 0.102);

vec2 CRTCurveUV(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(6.0, 4.0);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}
void DrawVignette(inout vec3 color, vec2 uv) {
    float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    vignette = clamp(pow(16.0 * vignette, 0.3), 0.0, 1.0);
    color *= vignette;
}
// 原版的 240.0（扫描线条数）和 640.0（荫罩条数）是给 720p / 1280 宽那一屏定的，
// 也就是 3px 一条扫描线、2px 一条荫罩。卡面尺寸跟着窗口变，所以这里改成按缓冲尺寸推条数，
// 把「间距恒为 3px / 2px」钉住 —— 照抄 240/640 会在小屏上糊成一片、大屏上抖出摩尔纹。
void DrawScanline(inout vec3 color, vec2 uv) {
    float scanline = clamp(0.95 + 0.05 * cos(3.14 * (uv.y + 0.008 * uTime) * (uRes.y / 3.0)), 0.0, 1.0);
    float grille = 0.85 + 0.15 * clamp(1.5 * cos(3.14 * uv.x * (uRes.x / 2.0)), 0.0, 1.0);
    color *= scanline * grille * 1.2;
}

void main() {
    vec2 crtUV = CRTCurveUV(vUv);
    // 管口边缘：crtUV 越界就是玻璃外。原版靠 16 次采样把这条硬边摊糊，这里换成 1.5px
    // 的距离衰减 —— 一趟一像素也不带锯齿。界外那个 min() 为负 → smoothstep 自己归 0。
    float edge = smoothstep(0.0, 1.5 / uRes.y,
        min(min(crtUV.x, 1.0 - crtUV.x), min(crtUV.y, 1.0 - crtUV.y)));
    vec3 screen = texture(uSignal, clamp(crtUV, 0.0, 1.0)).rgb;
    DrawVignette(screen, clamp(crtUV, 0.0, 1.0));
    vec3 color = mix(BEZEL, screen, edge);
    DrawScanline(color, vUv);
    fragColor = vec4(color, 1.0);
}`;

const canvas = document.querySelector<HTMLCanvasElement>('.crtcard .crtscr');
const slot = canvas?.closest<HTMLElement>('.slot');

// 移动端和 reduced-motion 不启动：卡面停在 CSS 那张静态屏纹上（fx 循环在那两种情况下
// 本来也不跑轨道，这张卡只是停在原地）。
if (canvas && slot &&
    matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches &&
    !matchMedia('(max-width: 768px)').matches) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
  let signalProg: WebGLProgram | null = null;
  let crtProg: WebGLProgram | null = null;

  const program = (fs: string) => {
    if (!gl) return null;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const p = gl.createProgram()!;
    const v = shader(gl.VERTEX_SHADER, VERT);
    const f = shader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };

  signalProg = program(SIGNAL_FS);
  crtProg = program(CRT_FS);

  if (gl && signalProg && crtProg) {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    // 两个程序各建一个 VAO：aPos 的属性位置是 per-program 的，切换程序时不用再碰属性状态
    const vaoFor = (p: WebGLProgram) => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const loc = gl.getAttribLocation(p, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      return vao;
    };
    const signalVao = vaoFor(signalProg);
    const crtVao = vaoFor(crtProg);
    gl.bindVertexArray(null);

    const signalTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, signalTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // LINEAR：量化那一档本来就是块状的，而这一趟是被放大不是被重采样，块之间不该有硬边
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SIGNAL_W, SIGNAL_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, signalTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const uni = (p: WebGLProgram, names: string[]) => {
      const out: Record<string, WebGLUniformLocation> = {};
      for (const n of names) {
        const l = gl.getUniformLocation(p, n);
        if (l) out[n] = l;
      }
      return out;
    };
    const su = uni(signalProg, ['uRes', 'uTime']);
    const cu = uni(crtProg, ['uSignal', 'uRes', 'uTime']);

    // 采样器绑到 0 号纹理单元：这条必须在该程序处于 current 时写，否则是 INVALID_OPERATION
    gl.useProgram(crtProg);
    gl.uniform1i(cu.uSignal!, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, signalTex);

    const t0 = performance.now();
    let last = -1e9;
    let w = 0, h = 0;
    let painted = false;

    ((window as any).__fx ||= []).push(() => {
      const now = performance.now();   // __fx 的回调不带参数（Base 那边是 f()）
      if (now - last < MIN_DT) return;
      // 切片期间画布被 CSS 藏起来了（cloneNode 带不过去位图），别给它花钱
      if (slot.classList.contains('is-bent')) return;
      // 屏幕外不放：整条轨道是 transform 推的，所以这里现量一次 rect（每帧一次的代价
      // 已经在 30fps 上限里压掉了；宽度用 clientWidth —— rect 会被牌堆的透视变换放大）
      const r = canvas.getBoundingClientRect();
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (cw <= 0 || r.right < -8 || r.left > innerWidth + 8) return;
      last = now;

      const dpr = Math.min(devicePixelRatio || 1, 2);
      const bw = Math.max(1, Math.round(cw * dpr));
      const bh = Math.max(1, Math.round(ch * dpr));
      if (bw !== w || bh !== h) { w = bw; h = bh; canvas.width = w; canvas.height = h; }
      const time = (now - t0) / 1000;

      gl.bindVertexArray(signalVao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, SIGNAL_W, SIGNAL_H);
      gl.useProgram(signalProg);
      gl.uniform2f(su.uRes!, SIGNAL_W, SIGNAL_H);
      gl.uniform1f(su.uTime!, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindVertexArray(crtVao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(crtProg);
      gl.uniform2f(cu.uRes!, w, h);
      gl.uniform1f(cu.uTime!, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!painted) { painted = true; canvas.style.opacity = '1'; }   // 首帧之前画布是黑的，别盖住静态屏纹
    });

    addEventListener('resize', () => { last = -1e9; }, { passive: true });
  }
}
