# 小朋友工具箱

给家长和小朋友用的免费小工具集合。纯网页：**免登录、不联网存储、不上传任何内容**，所有计算都在你自己的浏览器里完成。

**现在只有一个模块：田字格字帖生成器** —— 粘贴生字，自动生成带笔顺、描红、占格提示的 A4 练习页，可调格子大小 / 每页字数 / 是否出笔顺。

## 本地直接用（不用部署）

```bash
open index.html          # 双击 index.html 也一样
```

因为数据用 `<script>` 加载（不是 fetch），所以**直接双击本地文件就能完整使用**，不需要起服务器。

## 目录结构

```
.
├── index.html              看板首页（工具清单在文件里的 TOOLS 数组）
├── assets/style.css        共用样式
├── tianzige/               模块：田字格字帖生成器
│   ├── index.html          界面（配置面板 + 预览 + 打印）
│   └── app.js              渲染逻辑（SVG 生成、分页、URL 参数）
├── data/
│   ├── pinyin.js           字 → 拼音（约 2 万字，离线可用）
│   ├── lesson.js           本课 16 字的人工校对内容（笔顺名/占格要点/组词）
│   └── hanzi.js            本课 16 字的笔画+中心线（离线兜底）
├── hanzi/                  同上，原始 JSON（可读、便于再生）
├── ARPHICPL.TXT            笔画数据授权（必须保留）
├── LICENSE                 MIT（只覆盖代码）
├── NOTICE                  数据来源与授权说明
├── ROADMAP.md              模块路线 + 容量规划
└── publish.sh              一键发布到 GitHub Pages
```

## 新增一个工具模块

1. 建目录 `mytool/`，写 `index.html`（可引用 `../assets/style.css`）。
2. 在根目录 `index.html` 的 `TOOLS` 数组里加一条：

```js
{ id:'mytool', name:'工具名', emoji:'🎯', status:'live', path:'mytool/',
  grade:'一年级', tags:['语文'], desc:'一句话说明' }
```

`status` 写 `live` 可点击，写 `planned` 显示为灰掉的「规划中」。

## 田字格模块的配置

界面右侧面板，也可以直接用 URL 参数（方便分享一个配好的链接）：

```
tianzige/?chars=一二三上口耳目手&perPage=3&perRow=7&cell=24&trace=3&rows=2&strokes=1&tips=1&pinyin=1&words=1&title=1
```

- `chars` 生字表（汉字以外的字符自动忽略、自动去重）
- `perPage` 每页几个字（1–6）· `perRow` 每行几格（4–10）· `cell` 格子边长 mm（18–32）
- `trace` 描红格数（0–3）· `rows` 练习行数（1–3）
- `strokes/tips/pinyin/words/title` 开关，`1` 开 `0` 关

**笔顺、拼音对任意汉字都自动生成**；「占格要点」只有人工校对过的字是精编的，其余按笔画中心线自动生成并标注「自动生成·仅供参考」。

## 部署到 GitHub Pages

```bash
brew install gh && gh auth login     # 只需一次
bash publish.sh                      # 自动建仓库 <用户名>.github.io 并推送
```

访问地址：`https://<用户名>.github.io/`（首次生效需要 1~2 分钟）。

> 💡 国内访问 `*.github.io` 时通时不通。**给家长的传播主力建议用「打印出来的 PDF」**（微信可直接预览、转发、保存），网站留给愿意自己换字表的家长。

## 数据来源与授权（重要）

| 数据 | 来源 | 授权 |
|---|---|---|
| 汉字笔画轮廓 / 中心线 | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) → [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | **Arphic Public License**（须原样保留 `ARPHICPL.TXT`） |
| 拼音 | [pinyin-data](https://github.com/mozillazg/pinyin-data) | MIT |
| 本课 16 字的笔顺名/占格要点/组词 | 本项目作者整理 | 随本项目 |

代码（HTML/CSS/JS）是独立作品，用 MIT；上面那份 APL 数据不传染代码（APL 第 2 条明确的 mere aggregation）。
**再次分发时请保留 `ARPHICPL.TXT` 和 `NOTICE`。**
