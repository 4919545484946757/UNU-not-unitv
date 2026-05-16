# 样例与资源治理

[English](SAMPLE_GOVERNANCE.en-US.md)

更新日期：2026-05-16

## 真源规则

- `Sample-project-list/` 是内置样例工程的唯一真源。
- 每个样例工程必须包含 `project.json` 与 `manifest.json`。
- `assets-for-sample/` 不再参与运行和打包；原始素材如需保留，应放在外部素材归档或单独文档说明来源。
- `sample-project/` 不再作为打包资源。旧的 `sample-project` 字符串只作为内存 fallback 兼容入口，编辑器逻辑应优先读取 `project.mode`。
- `public/assets/` 不手动维护。需要浏览器 fallback 资源时，运行脚本从样例工程生成。

## 样例目录结构

推荐结构：

```text
Sample-project-list/<sample-id>/
  manifest.json
  project.json
  scenes/
  assets/
    images/
    audio/
    scripts/
    animations/
  prefabs/
  README.md
```

当前内置样例：

- `Sample-project-list/sample-2D-shooting`
- `Sample-project-list/snake`

## manifest 字段

```json
{
  "format": "unu-sample-manifest",
  "version": 1,
  "id": "snake",
  "title": "Snake Demo",
  "description": "Playable Snake sample.",
  "available": true,
  "projectFile": "project.json",
  "entryScene": "Snake.scene.json",
  "tags": ["2d", "arcade"]
}
```

- `id`：稳定样例 ID，建议与目录名一致。
- `title`：启动页显示名。
- `description`：启动页描述。
- `available`：是否可打开。
- `projectFile`：项目描述文件，通常为 `project.json`。
- `entryScene`：推荐启动场景。
- `tags`：用于后续分类、筛选和文档生成。

Electron 启动页会动态扫描 `Sample-project-list/*/manifest.json`，所以新增样例通常只需要新增一个目录和 manifest，不需要改启动页硬编码。

## public 资源生成

默认不提交 `public/assets/`。如需在纯浏览器 fallback 中查看内置资源，可运行：

```bash
npm run assets:sync-public
```

该命令会从 `Sample-project-list/sample-2D-shooting/assets` 生成 `public/assets`。

## 重复资源审计

运行：

```bash
npm run assets:audit
```

脚本会按媒体文件 hash 输出重复组。当前目标是让重复组保持为 `0`，避免样例工程、public 目录和旧素材目录三处双写。

## 大小写约定

样例目录统一使用小写 kebab-case。历史目录 `Sample-project-list/Snake` 已改为：

```text
Sample-project-list/snake
```
