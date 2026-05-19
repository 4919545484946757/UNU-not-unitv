# UNU 架构说明：领域模型、Scene Store 与可测试操作层

[English](ARCHITECTURE.en-US.md) | 中文

更新时间：`2026-05-19`  
适用版本：`0.5.0`

UNU 正在从“Pinia 直接承载大量 class 实例和业务逻辑”迁移到 DTO + 操作层。`SceneData`、`EntityData`、`ComponentData` 是可序列化 DTO；`sceneSerializer` 负责 DTO 与运行态 class 的边界；`SceneOperations` 提供可脱离 Vue/Pinia 单测的纯函数；`scene.ts` 负责状态、历史、消息和调用操作层。
