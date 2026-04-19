# UNU Engine 新手教程（快速上手）

更新时间：2026-04-19

## 1. 你将完成什么
完成本教程后，你可以：
- 打开并运行示例项目
- 在场景中选中/移动实体
- 给实体添加脚本和动画状态机
- 用 WASD + 鼠标左键体验 Player 移动与射击

## 2. 环境准备
1. 安装 Node.js（建议 LTS）
2. 在项目根目录安装依赖：
```bash
npm install
```
3. 启动编辑器（Vite + Electron）：
```bash
npm run dev
```

## 3. 编辑器界面速览
- 左侧：场景树、资源树
- 中央：Viewport（场景可视化与选中操作）
- 右侧：Inspector / Script / Timeline 面板
- 顶部：工具栏（播放、暂停、保存、实体操作）

## 4. 第一次运行示例
1. 点击顶部“播放”
2. 控制 Player：
   - `W/A/S/D`：移动（支持斜向等速）
   - 鼠标左键：射击
3. 观察：
   - Enemy 会追踪 Player
   - 子弹命中 Enemy 后会重生
   - Player 状态机会在 Idle/Run/Attack 间切换

## 5. 常见编辑操作
## 5.1 选中与变换
1. 在场景树或视口点击实体
2. 在 Inspector 修改 `Transform`（位置、缩放、旋转）

## 5.2 调整碰撞箱
1. 选中实体
2. 在 Inspector 的 `Collider` 中调整 `Width/Height`
3. 进入播放态验证是否符合预期

## 5.3 配置动画状态机
1. 选中带 `Animation` 的实体
2. 在 Inspector 或 Timeline 的状态机区域：
   - 新增状态（例如 `Jump`）
   - 配置转场（from/to/condition）
   - 调整高级参数：
     - `priority`
     - `canInterrupt`
     - `once`
     - `minNormalizedTime`

## 6. 脚本系统最小示例
在脚本中你常用的 API：
- `ctx.api.input.getMoveVector(true)`
- `ctx.api.findEntityByName(name)`
- `ctx.api.spawnEntity(entity)`
- `ctx.api.removeEntity(entity)`
- `ctx.api.isBlockedRect(...)`

示例结构：
```js
export default {
  onInit(ctx) {},
  onStart(ctx) {},
  onUpdate(ctx) {
    const move = ctx.api.input.getMoveVector(true)
    // your logic...
  },
  onDestroy(ctx) {}
}
```

## 7. 保存与另存项目
- 常规保存：保存当前场景与资源变更
- 项目另存：可将示例项目另存到本地目录进行独立开发

## 8. 排错建议
- 运行后无法选中实体：
  - 检查是否在正确工具模式（Select）
- 动画状态卡住：
  - 检查转场 `condition` 与 `minNormalizedTime` 是否冲突
- 角色穿墙：
  - 检查脚本是否使用 `isBlockedRect` 而非单点检测

## 9. 推荐下一步
1. 给 Player 增加 `Jump` 状态和对应转场
2. 给 Enemy 增加受击闪烁动画
3. 使用 Timeline 为技能特效加事件轨道

