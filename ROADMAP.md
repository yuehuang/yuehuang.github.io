# 规划

## 0. 原则

1. **先找现成的，别造轮子。** 同类开源项目已经有十来个（见 §2），能用就直接用/链接过去。
2. **自研只做差异化的部分**：老师讲的「占格口诀」（横中线 / 竖中线的中文讲解）、跟课本生字表同步、完全离线可用。
3. **一个仓库 = 一个站点。** 新工具 = 新目录 + `TOOLS` 里加一条，**不要**给每个工具建一个仓库。
4. **少屏幕。** 能打印的就打印，孩子的训练尽量不依赖屏幕。

## 1. 模块路线

| 版本 | 内容 | 状态 |
|---|---|---|
| v0 | 看板 + 田字格字帖生成器（笔顺 / 描红 / 占格提示 / 全参数可调 / URL 分享） | ✅ 完成 |
| v0.1 | 把「本课 16 字」的成品 PDF 也挂到站上，家长可直接下载打印 | 待做 |
| v1 | 占格口诀库扩充：按课本单元整理人工校对内容（现在只有 16 字） | 待做 |
| v1.1 | 看板增加「外链」类型卡片：直接推荐现成的优秀工具（§2） | 待做 |
| v2 | 互动笔顺描红（基于 hanzi-writer：逐笔动画 + 描红打分） | 待做 |
| v2.1 | 舒尔特方格 / 专注力打卡表 / 拼音卡 / 识字卡 / 口算 | 按需 |

## 2. 已调研的现成项目（2026-09-14 查）

| 项目 | Star | 说明 |
|---|---|---|
| [bunian/tianzigebishun](https://github.com/bunian/tianzigebishun) | ★390 | 田字格笔顺生成 |
| [CyangHH/zt](https://github.com/CyangHH/zt) | ★138 | 田字格/米字格字帖，支持笔顺、拼音，在线生成器 |
| [hyman-ren/tianzige](https://github.com/hyman-ren/tianzige) | ★33 | 田字格字帖生成器 |
| [caicaicai/miaozitie](https://github.com/caicaicai/miaozitie) | ★28 | 喵字帖 · 小学生笔画练字帖生成器（[在线](https://miaozitie.80wdb.com/)） |
| [HinsChueng/zitie](https://github.com/HinsChueng/zitie) | ★24 | Python 生成田字格字帖 |
| [rickytan/HanZiFun](https://github.com/rickytan/HanZiFun) | ★10 | 离线可用的写字练习本生成器：描红 / 笔顺分解 / 空白格纸 / 文章临摹（[在线](https://rickytan.cn/HanZiFun/)） |
| [njhongguan/chinese-calligraphy-generator](https://github.com/njhongguan/chinese-calligraphy-generator) | ★5 | A4 打印，支持诗词/文章排版 |
| [ibeilly/hanzi-practice](https://github.com/ibeilly/hanzi-practice) | ★1 | 网页练习：田字格笔顺动画、拼音与**朗读** |
| [oakZ/quxiehanzi](https://github.com/oakZ/quxiehanzi) | ★1 | 儿童笔顺演示 + 精细轨迹书写，内置古诗词、文本播报 |
| 底层库 [chanind/hanzi-writer](https://github.com/chanind/hanzi-writer) | — | 笔顺动画 + 描红打分（quiz 模式），本项目 v2 计划复用 |

**结论**：通用「田字格生成」已被做得很透，本项目不再往「通用」方向投入，只保留两条差异线：
① 中文**占格口诀**（对应老师课堂讲法，现有项目基本没有）；② 与课本**生字表同步**的成品材料。

## 3. 容量规划（1 GB / 100 GB 是需要盯的两个数）

官方限制（[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)）：
发布站点 **≤ 1 GB** · 软带宽 **100 GB/月** · 软限制 **10 次构建/小时** · 每个账号**只能有 1 个用户主站** · 不得当免费通用主机/商业 SaaS。

**实测：本站现在 408 KB。** 换算一下：

| 内容 | 体积 | 说明 |
|---|---|---|
| 本站全部代码 + 拼音表 + 笔画数据 | ≈ 0.4 MB | 只用了 1 GB 的 0.04% |
| 全量汉字笔画数据（9000+ 字） | 29 MB | 就算全打包进去也才 3% |
| 音频：30 分钟 mp3 | ≈ 28 MB | 100 个故事 ≈ 2.8 GB ❌ |
| 扫描 PDF：100 页 | 50–200 MB | 几本就到 1 GB ❌ |
| 视频：1 分钟 1080p | 20–40 MB | 最吃空间 ❌❌ |

**结论：1 GB 对「代码 + 小数据」够用非常久（还能再放 30 倍的笔画数据）；会撑爆的只有媒体文件——而那种东西本来就不该放 Pages。**

所以分层：

| 内容类型 | 放哪 | 何时切换 |
|---|---|---|
| 代码、字表、小数据（< 100 MB） | **本仓库 / Pages** | 一直 |
| 音频、视频、扫描件、大 PDF | **GitHub Releases**（单文件 ≤2 GB，不计入站点体积）或外部对象存储 | 一旦出现媒体文件 |
| 真要长期做大 | 备案域名 + 国内对象存储/CDN（域名 ~50 元/年 + 流量费） | 带宽或国内访问成为瓶颈时 |

**监控阈值**：仓库 > 500 MB、或月带宽接近 100 GB（≈ 每天 3.3 GB）→ 立刻动手拆分。
按「每天 100 个家长各下载 2 MB PDF」估算，一年也到不了 100 GB —— 现阶段完全不用操心。

## 4. 待办

- [ ] 登录 gh 并执行 `bash publish.sh`，把站跑起来
- [ ] 定站名和模块命名（见对话）
- [ ] 决定：通用生成器是自研保留，还是 v1.1 改成推荐现成工具的「外链卡片」
- [ ] v0.1：把 16 字成品 PDF 挂到站上
