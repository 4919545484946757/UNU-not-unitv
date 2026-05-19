# UNU Engine 新手教程

[English](BEGINNER_TUTORIAL.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

## 快速开始

```bash
npm install
npm run dev
```

启动后先进入 Launcher，可打开历史项目、示例项目、本地项目，也可新建、重命名或删除项目。新建项目会在选择目录下创建同名子文件夹。

## 示例项目

- `2D Action Demo`：`Sample-project-list/sample-2D-shooting`，包含移动、疾跑、射击、Enemy 生命值、背包、容器、药品、护甲、枪械、调试道具、门禁卡、场景切换和底部物品栏预览。
- `Snake`：`Sample-project-list/snake`，包含经典移动、得分、难度、暂停菜单、游戏结束菜单和快捷键重置。

## 常用流程

1. 在 Scene 树选择实体或类文件夹。
2. 在 Inspector 编辑组件。
3. 在 Scene View 移动、缩放、旋转或 Shift 多选批量操作。
4. 在资源树管理图片、音频、脚本、HTML、物品和 Prefab。
5. 保存后点击播放预览。

## 脚本

项目脚本位于 `assets/scripts/`，包括 `ScriptRuntime.ts`、`InputState.ts`、`AudioRuntime.ts`、`shared/`、`interactions/` 与 `scenes/<SceneName>/`。保存脚本会热重载，错误会定位到资源树文件和行号。

## UI 与物品

UI 支持 Text、Markdown、Button、Slider 和 HTML Overlay。HTML UI 可链接 `assets/ui/*.html` 并通过 `window.UNU.emit(type, payload)` 与脚本通信。物品使用 `[项目名]:[物品英文名]` 命名空间，注册表位于 `assets/items/items.registry.json`。

## Web 导出

导出目录包含 `index.html`、`project.json`、`assets/`、`scenes/`、`prefabs/`、`PLAY_GAME.bat`、`PLAY_GAME.ps1` 和 `export-report.json`。请运行 `PLAY_GAME.bat`，不要直接打开 `index.html`。
