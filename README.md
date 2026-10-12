# Pheth · 成年人的随想

以生活、关系与自我观察为主题的极简中文 Astro 随笔博客，部署目标为 Cloudflare Pages，正式域名 `https://blog.pheth.com`。

包含响应式布局、深浅主题、Markdown 文章、标签、归档、文章目录、RSS、站点地图与 404 页面。初始文章列表为空，可在 `src/content/posts/` 添加自己的文字。

## 本地开发

需要 Node.js >= 22.12，推荐 Node.js 24。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## 写文章

在 `src/content/posts/` 新建 `your-slug.md`：

```yaml
---
title: '文章标题'
description: '文章摘要'
date: 2026-10-12
tags: ['技术']
draft: false
---
```

下方编写 Markdown 正文。文件名对应 `/posts/your-slug/`。`draft: true` 不会出现在文章、列表、标签、RSS 和站点地图中。

编辑 `src/pages/about.astro` 设置个人介绍，`src/layouts/Base.astro` 修改站点信息，`src/styles/global.css` 调整外观。

## Cloudflare Pages

### 命令行部署

```sh
npx wrangler login
npx wrangler pages project create pheth-blog --production-branch=main
npm run deploy
```

### Git 自动部署（可选）

在 Cloudflare → Workers & Pages → Create application → Pages → Connect to Git，选择本仓库。注意 Direct Upload 项目不能直接切换为 Git 集成；需要自动部署时，优先通过 Git 集成创建项目，或使用 CI 执行 Wrangler。

- 框架：Astro
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：`NODE_VERSION=24`
- 生产分支：`main`（或实际默认分支）

这是纯静态项目，不需要 Cloudflare SSR adapter。

## 绑定 blog.pheth.com

1. Pages 项目 → Custom domains → Set up a custom domain，输入 `blog.pheth.com`。
2. 如果 `pheth.com` 的 DNS 已托管在同一个 Cloudflare 账户，按照向导创建 DNS 记录。
3. 如果 DNS 在其他平台，先在 Pages 添加域名，再到 DNS 平台添加 CNAME：名称 `blog`，目标为该 Pages 项目显示的 `*.pages.dev` 域名。若已有同名记录，先确认其用途。
4. 等待域名验证及 TLS 证书签发，状态显示 Active 后访问正式域名。

只添加 CNAME 而未在 Pages 绑定自定义域名是不够的。正式域名已写入 Astro、RSS 与 robots 配置；更换域名时需同步修改。

官方文档：[Astro on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)、[自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)。

## 特殊目录名

当前工作目录包含字面量 `*`，会触发上游依赖的路径解析问题。脚本会自动复制到临时目录执行，构建完成后将 `dist` 同步回项目。在这种目录下开发预览为快照，修改后需重启；普通目录下仍支持正常热更新。

## 文章阅读统计

文章正文、首页列表、归档和标签列表显示累计阅读次数。正文在浏览器首次可见时请求一次计数；刷新或重新打开会再次累计，列表浏览不计数。因此它是阅读次数（PV），不是独立读者人数（UV），也不代表读完全文。功能上线之前的阅读量不补算。

统计由 `functions/api/views.js` 和 Cloudflare D1 `pheth-blog-views` 提供；数据库仅保存文章 slug 和次数，不保存 IP、Cookie 或读者身份。计数使用原子 SQL，部署不会清零。改文件名会改变 slug，并从零开始；文章下线后不再展示旧计数。前端请求失败显示“阅读统计暂不可用”，不影响正文。

只有构建清单 `post-slugs.json` 中的已发布文章允许计数，跨站请求及预览域名写入被拒绝。该公开计数接口不提供严格反刷，自动化脚本仍可能抬高计数，不能作为审计或结算数据。

首次设置或新增数据库迁移：

```sh
npx wrangler d1 migrations apply pheth-blog-views --remote
```

部署继续使用 `npm run deploy`，部署脚本会让 Wrangler 编译根目录的 Pages Functions，并兼容项目路径中的字面量 `*`。`public/_routes.json` 仅让 `/api/views` 进入函数，其余页面继续静态服务。

本地完整验证（使用本地数据库）：

```sh
npm run build
npx wrangler d1 migrations apply pheth-blog-views --local
npx wrangler pages dev dist
```

普通 `npm run dev` / `npm run preview` 仅提供 Astro 页面，不包含统计 API。接口测试使用 Node.js 24：`node --test tests/views.test.mjs`。
