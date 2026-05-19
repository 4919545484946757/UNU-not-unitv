# Runtime 架构拆分记录

[English](RUNTIME_ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

Runtime 保留通用能力，把具体玩法留在项目脚本中。2D Action Demo 的 Player、Enemy、Bullet、Door、Chest、Inventory、Container、Items、Guns 等逻辑都位于 `Sample-project-list/sample-2D-shooting/assets`。
