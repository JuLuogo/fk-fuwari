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
| 构建 | GitHub Actions（改动图片以外才构建） |
| 部署 | 构建产物推到 `pages` 分支，由 GitHub Pages / Vercel 托管 |

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
├── .pages.yml                 # Pages CMS 配置（后台字段 / 图片目录 / 文件命名 / 手动构建按钮）
├── .github/workflows/         # pages-build.yml：构建并发布到 pages 分支
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

> ⚠️ **改过 `.pages.yml` 之后要手动刷新配置**：Pages CMS 会把仓库里的 `.pages.yml` 缓存在它自己的数据库里，
> 平时直接读缓存，不会自动跟着 GitHub 更新。所以改完配置（新增字段、按钮等）后，去左侧 **Cache** 页面，
> 在 Config 那一栏点 **Refresh cache**，再重新打开文章编辑页，新字段/新按钮才会出现。
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

## 加密文章（单篇密码保护）

正文在**构建期**用密码派生的密钥加密（PBKDF2-SHA256 60 万次 + AES-256-GCM），
访客在浏览器里输入密码、由 WebCrypto 解密后渲染。有两种用法，按需选一种：

### 方式一：填「文章密码」字段（推荐，最省事）

| 字段 | 值 |
| --- | --- |
| 文章密码 | 你的密码 |
| 已加密 | 打开 |
| 密码提示 | 可选，显示在解锁框里 |

保存即可。**每次构建都会用当时的正文重新加密**，所以：

- 改正文 → 下次构建自动生效，不用做别的
- **改密码 → 直接改「文章密码」字段再保存**，下次构建自动用新密码
- 取消加密 → 把「已加密」关掉

> 这个方式密码会写进仓库的 frontmatter（连明文正文一起，都在仓库里），
> 它挡住的是"随便点开看看"的读者，不是会读仓库的人。别放真正的机密。

### 方式二：不把密码写进仓库（用按钮加密）

1. 「文章密码」留空
2. 打开文章编辑页，点右上角 **「加密这篇文章」**，在弹窗里填密码
3. Pages CMS 会触发 [`.github/workflows/encrypt-post.yml`](.github/workflows/encrypt-post.yml)：
   渲染正文 → 加密 → 提交 `src/data/encrypted/<slug>.json` → 触发一次发布构建

密码只出现在那次 Actions 运行的临时目录里（已 `add-mask`），用完即删，不提交。
代价是**改了正文要再点一次按钮**（密文是快照）。

> 两种方式的优先级：**填了「文章密码」就用方式一**（每次构建重新加密），
> 没填才回落到 `src/data/encrypted/` 里的密文。

### 本地加密

```bash
pnpm lock-post <slug> --password 你的密码   # 写 src/data/encrypted/<slug>.json
```

### 需要注意

- WebCrypto 需要 **HTTPS 或 localhost**，用 `http://局域网IP` 打开时无法解密
- 密码忘记无法找回（密钥由密码派生，没有后门），改个新密码重新构建即可
- 加密文章的正文不进站内搜索；**RSS 不输出正文**，首页卡片也不显示正文摘要
- 明文只存在浏览器内存里，不会写 localStorage / sessionStorage
- 仓库里自带一篇示例 `encrypted-demo`（密码 `fk-2026`），删掉
  `src/content/posts/encrypted-demo.md` 即可移除

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

## 构建与发布

构建由 GitHub Actions（[`.github/workflows/pages-build.yml`](.github/workflows/pages-build.yml)）负责，
产物推到一个叫 **`pages`** 的分支，站点从那个分支对外提供。

### 自动构建的规则

推送到 `main` 时先看这次提交改了什么：

| 改动内容 | 是否构建 |
| --- | --- |
| 只有 `public/images/` 下的图片 | **跳过**（文章还没写完、刚粘了图，不会白白部署一次） |
| 正文 / frontmatter / 配置 / 样式 / 依赖 / 密文 …… 任何其他文件 | 构建并发布到 `pages` 分支 |
| 拿不到上一次提交（首次推送、强制推送） | 保守起见，构建 |

### 手动构建

两个入口，效果一样（会强制构建一次）：

1. **Pages CMS 左侧栏的「立即发布构建」按钮**（配置在 [`.pages.yml`](.pages.yml) 的 `actions` 里）
2. GitHub → Actions → **Build and publish** → Run workflow

> 为什么需要手动按钮：自动构建会跳过"只传图片"的提交，所以**新上传的图片要等下一次内容改动或手动构建才会真正发布**。
> 写完文章后点一下「立即发布构建」，图片和正文就一起上线了。

### 部署方式 A：GitHub Pages（推荐）

1. 仓库 Settings → Pages → Build and deployment → Source 选 **Deploy from a branch**
2. Branch 选 **`pages`**，目录选 **`/` (root)**，保存
3. 等 Actions 跑完，站点地址是 `https://<用户名>.github.io/<仓库名>/`

工作流会在产物里放一个 `.nojekyll`，确保 `_astro/` 这类下划线目录能正常访问。

**地址要对得上**，否则样式和图片会 404：

| 站点形式 | astro.config.mjs 要改的 |
| --- | --- |
| 自定义域名（如 `https://fk.example.com/`） | `site: "https://fk.example.com/"`，`base: "/"` |
| 用户主页仓库（`<用户名>.github.io`） | `site: "https://<用户名>.github.io/"`，`base: "/"` |
| 项目页（`https://<用户名>.github.io/<仓库名>/`） | `site: "https://<用户名>.github.io"`，`base: "/<仓库名>/"` |

改完推一次，触发自动构建即可。

### 部署方式 B：继续用 Vercel

Vercel 不再直接从 `main` 构建，而是"托管 `pages` 分支里的静态文件"：

1. Vercel 项目 → Settings → Git → **Production Branch** 改成 `pages`
2. Settings → Build & Development Settings：Framework Preset 选 **Other**，**Build Command 留空**，**Output Directory 填 `.`**
3. 建议把 "Ignored Build Step" 设为只在 Production 分支构建，避免 `main` 推送触发无意义的预览构建

### 第一次跑之前

- Actions 需要能推送分支：Settings → Actions → General → Workflow permissions 选 **Read and write permissions**
  （工作流里已声明 `permissions: contents: write`，如果仍报 403 再检查这一项）
- 分支保护规则不要拦住 `pages` 分支的推送

## 致谢

- [Fuwari](https://github.com/saicaca/fuwari) by [saicaca](https://github.com/saicaca)
- [Astro](https://astro.build/)
- [Pages CMS](https://pagescms.org)

## License

文章内容版权归作者所有；代码部分遵循 [MIT](LICENSE)。文章默认采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 授权。
