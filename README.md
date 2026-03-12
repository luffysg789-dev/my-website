# claw800.com MVP

类似 hao123 的 AI 导航网站，支持：
- 首页展示已审核网站
- 用户免费投稿
- 后台审核通过/驳回
- 后台手动新增
- 后台批量导入 JSON（适合一次性导入 OpenClaw 站点）
- 启动时自动导入 `seed/openclaw-sites.json` 作为首批 OpenClaw 站点

## 1. 安装

```bash
npm install
```

## 2. 启动



## 3. 数据

- SQLite 文件：`data/claw800.db`
- 首批站点清单：`seed/openclaw-sites.json`

你可以把所有基于 OpenClaw 的站点先填到 `seed/openclaw-sites.json`，首次运行会自动导入并展示。
如果某个 URL 已存在，不会重复导入。

## 4. API（核心）
