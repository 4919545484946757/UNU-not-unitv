# Web 导出能力说明

[English](EXPORT_WEB.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

0.5.0 已确认支持：多场景与 `sceneCatalog`、嵌套 Scene 文件树数据、完整 `assets/`、项目脚本、场景级脚本、HTML UI、物品注册表、物品脚本、音频、图片、Prefab、HTML UI 桥和 `export-report.json`。导出后运行 `PLAY_GAME.bat`，不要直接双击 `index.html`。`tests/exportGame.test.ts` 会验证基础导出文件、启动场景、导出报告，以及嵌套脚本、物品、HTML UI 等资源是否被复制。
