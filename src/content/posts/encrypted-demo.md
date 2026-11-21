---
title: 加密文章示例
published: 2026-11-21
description: 演示单篇密码保护：正文在构建期加密，浏览器里输入密码才解密。
tags: ["示例"]
category: 随笔
draft: false
passwordHint: 付康FK 的缩写 + 年份
encrypted: true
---

# 这是一篇加密文章

如果你能看到这些文字，说明密码正确 ✅

## 它是怎么工作的

1. **构建期加密**：执行 `pnpm lock-post` 时，先用站点自己的 Markdown 管线把正文渲染成 HTML，
   再用文章密码派生密钥（PBKDF2-SHA256，60 万次迭代），用 AES-256-GCM 加密。
2. **仓库里只有密文**：加密结果写到 `src/data/encrypted/<slug>.json`，
   文章源文件变成只含 frontmatter 的 stub；明文和密码留在被 gitignore 的 `private/` 里。
3. **浏览器里解密**：访客输入密码 → WebCrypto 解密 → 把正文注入页面。

## 所以

- 线上 HTML 里没有任何明文，右键查看源代码也只能看到一段密文
- 密码错误会直接解密失败（GCM 认证不通过），不存在「前端判断密码」的漏洞
- 这篇示例的密码是 **fk-2026**

::github{repo="JuLuogo/fk-fuwari"}

> 这篇示例文章可以随时删除：删掉 `src/content/posts/encrypted-demo.md` 和
> `src/data/encrypted/encrypted-demo.json` 即可。
