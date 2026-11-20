# 付康FK

> 记录生活与技术的个人博客 —— https://fk-fuwari.vercel.app/

基于 [Astro](https://astro.build/) + [Fuwari](https://github.com/saicaca/fuwari) 主题，用 [Pages CMS](https://pagescms.org) 在浏览器里写作，托管在 Vercel。

---

## 技术栈

| 用途 | 方案 |
| --- | --- |
| 静态站点 | Astro 5 |
| 主题 | Fuwari（Tailwind CSS + Svelte） |
| 站内搜索 | Pagefind（构建时生成索引） |
| 内容管理 | Pages CMS（Git 驱动，保存即提交） |
| 部署 | Vercel（推送到 main 自动构建） |

## 本地开发

```bash
pnpm install    # 安装依赖
pnpm dev        # 本地预览 http://localhost:4321
pnpm build      # 构建到 dist/（同时生成 Pagefind 搜索索引）
pnpm preview    # 预览构建结果
pnpm check      # Astro 类型检查
pnpm new-post   # 用脚本新建一篇文章
```

## 目录结构

```text
.
├── .pages.yml                 # Pages CMS 配置（后台字段 / 图片目录 / 文件命名）
├── astro.config.mjs           # Astro 配置（站点域名在 site 字段）
├── public/
│   ├── favicon/               # 站点图标（由头像生成）
│   └── images/                # Pages CMS 上传图片的目录（含默认横幅 banner.jpg）
└── src/
    ├── config.ts              # 站点名称、副标题、头像、导航、社交链接
    ├── data/site.json         # 横幅 / 全站公告 / ICP 备案（可在 Pages CMS 里改）
    ├── assets/images/         # 头像 avatar.jpg
    ├── content/
    │   ├── posts/             # 文章（Markdown）
    │   └── spec/about.md      # 「关于」页面
    ├── components/            # 页面组件
    ├── layouts/               # 页面布局
    └── pages/                 # 路由
```

## 在浏览器里写作：Pages CMS

仓库根目录的 [`.pages.yml`](.pages.yml) 已经配置好了文章、关于页面、站点设置和图片上传，无需再改代码。

1. 打开 <https://app.pagescms.org>，用 GitHub 账号登录。
2. 首次使用需要为 Pages CMS 安装 GitHub App，并授权 `JuLuogo/fk-fuwari` 这个仓库（只给这一个仓库权限即可）。
3. 在仓库列表里选择 `fk-fuwari`，左侧会出现「文章」「关于页面」「站点设置」三个入口。
4. 新建 / 编辑文章，保存后 Pages CMS 会自动向仓库提交一次 commit，Vercel 随之重新部署。

### 文章字段

| 字段 | 说明 |
| --- | --- |
| 标题 | 文章标题，同时用于生成默认文件名 |
| 发布日期 | 首页排序依据，格式 `YYYY-MM-DD` |
| 摘要 | 首页卡片和搜索结果中的简介 |
| 封面图 | 可选，从「图片」媒体库选择或上传 |
| 标签 | 可多个，标签页会自动汇总 |
| 分类 | 单值，分类页会自动汇总 |
| 草稿 | 打开后仅本地可见，不会出现在线上站点 |
| 置顶 | 打开后排在首页与归档的最前面，卡片和文章页会显示「置顶」标记 |
| 正文 | Markdown 所见即所得编辑器 |

> 新建文章时文件名默认是 `日期-标题.md`，中文标题生成的 URL 可能不好看，可以在创建时把文件名改成英文或拼音，例如 `hello-world.md`，这样文章地址就是 `/posts/hello-world/`。

### 站点设置（横幅 / 全站公告 / ICP）

「站点设置」写入 [`src/data/site.json`](src/data/site.json)，也可以直接改这个文件：

| 配置 | 说明 |
| --- | --- |
| 首页横幅 | `banner.enable` 打开后首页顶部显示大图；`banner.src` 从图片库选或上传；`position` 控制图片上下对齐；`credit` 是右下角的图片来源标注 |
| 全站公告 | `announcement.enable` 打开且 `text` 不为空时，所有页面顶部显示一条通知；`type` 决定配色（普通蓝 / 成功绿 / 提醒黄 / 重要红）；`closable` 允许访客关掉；`link` 可加一个跳转链接 |
| ICP 备案 | `icp.number` 填上就显示在页脚并链接到工信部官网，留空则完全不显示 |

公告的关闭状态记在访客浏览器里：想让老访客重新看到（比如换了新公告），把「公告标识」`id` 改一个值，或者直接改公告内容即可，留空时会按内容自动生成标识。

### 图片

- 上传的图片统一存放在 `public/images/`，写入文章里的路径是 `/images/xxx.jpg`。
- 头像是构建期资源，放在 `src/assets/images/avatar.jpg`，需要替换时直接覆盖同名文件即可（站点图标 `public/favicon/` 目前由它生成）。

## 也可以直接写 Markdown

```markdown
---
title: 文章标题
published: 2026-11-20
description: 一句话摘要
image: /images/cover.jpg
tags: ["标签A", "标签B"]
category: 随笔
draft: false
pinned: false
---

正文……
```

## 站点自定义

- **横幅 / 全站公告 / ICP 备案**：`src/data/site.json`（也可在 Pages CMS 的「站点设置」里改）
- **站点名称 / 副标题 / 语言 / 主题色 / 导航栏 / 头像 / 个人简介 / 社交链接**：`src/config.ts`
- **关于页面**：`src/content/spec/about.md`
- **站点域名**（用于 sitemap 和 RSS）：`astro.config.mjs` 中的 `site`
- **每页文章数**：`src/constants/constants.ts` 中的 `PAGE_SIZE`

## 部署

推送到 `main` 分支即可自动部署到 Vercel。首次部署时在 Vercel 里导入本仓库即可，构建设置：

- 框架预设：Astro
- 构建命令：`pnpm build`
- 输出目录：`dist`

如果你用了别的域名，记得同步修改 `astro.config.mjs` 里的 `site`。

## 致谢

- [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca)
- [Astro](https://astro.build/)
- [Pages CMS](https://pagescms.org)

## License

文章内容版权归作者所有；代码部分遵循 [MIT](LICENSE)。文章默认采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 授权。
