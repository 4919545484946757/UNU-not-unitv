# UNU Architecture: Domain Model, Scene Store, And Testable Operations

[中文](ARCHITECTURE.zh-CN.md) | English

Updated: `2026-05-19`  
Version: `0.5.0`

UNU is migrating from Pinia owning many class instances and business rules toward DTO + operations. `SceneData`, `EntityData`, and `ComponentData` are serializable DTOs; `sceneSerializer` owns the DTO/runtime-class boundary; `SceneOperations` provides pure functions testable outside Vue/Pinia; `scene.ts` owns state, history, messages, and orchestration.
