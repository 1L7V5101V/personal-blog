---
title: Ubiquitous Language —— 硅光挠曲电统一记号表
date: 2026-08-20
tag: 笔记
---

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
| **应变梯度** | $\partial\epsilon_{11}/\partial x_{3}$ | 沿厚度方向的轴向应变梯度，单位 $\text{m}^{-1}$ | $G$、$\kappa'$、$\epsilon$ |
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

**"零自由拟合参数"的说法当前不成立**：$\alpha$、$R_{\mathrm f}$、$C_{A}$ 均为选定值，$\varphi$ 更是一手出处缺失。行文改为"除表面形变势 $\varphi$ 外不引入可调参数"，并把 $\varphi$ 标为模型中唯一的可调项及其出处缺口。$\alpha$ 与 $R_{\mathrm f}$ 若取得椭偏/反射谱实测值则同步替换（当前敏感性区间 $(0.8\sim1.5)\times10^{5}\ \text{cm}^{-1}$ 与 $0.42\sim0.48$）。