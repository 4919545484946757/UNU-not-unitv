# UNU Engine 新手教程（快速上手）

更新时间：`2026-04-23`

## 1. 你将学会什么

完成本教程后，你可以：

- 使用启动器创建/打开项目
- 在编辑器中完成场景与实体基础编辑
- 跑通示例项目的移动、射击、交互、切场景流程
- 使用脚本配置 Player/Enemy/可交互对象

## 2. 环境准备

1. 安装 Node.js（建议 LTS，18+）。
2. 在项目根目录安装依赖：

```bash
npm install
```

3. 启动编辑器（Vite + Electron）：

```bash
npm run dev
```

## 3. 启动器（Launcher）使用

启动后先进入启动器界面，可以做以下操作：

- 打开历史项目
- 打开本地已有项目目录
- 新建项目（推荐）
  - 可填“项目名称”和“目标目录”
  - 创建路径固定为：`目标目录/项目名称/`
  - 留空时将使用默认项目名，并在创建时选择目录

## 4. 编辑器界面速览

- 左侧：场景树、资源树
- 中央：Scene View（可编辑与播放预览）
- 右侧：Inspector / Script / Timeline 等面板
- 顶部：项目、场景、实体下拉工具与编辑工具按钮

## 5. 第一轮操作（推荐）

1. 在“项目”菜单选择“新建项目”或“打开工程”。
2. 在“场景”菜单新建场景。
3. 在“实体”菜单新建实体（如 `player` / `enemy` / `tilemap`）。
4. 在 Inspector 调整 `Transform` / `Sprite` / `Collider`。
5. 点击播放按钮进入预览。
6. 再次点击可暂停/继续，点击停止退出预览。

## 6. 示例项目玩法验证

打开示例项目后，可直接验证：

- `W/A/S/D` 控制 Player 移动（斜向保持速度正确）
- 鼠标左键射击
- Enemy 追踪玩家，被子弹命中后销毁并重生
- 接近可交互门，右键交互触发场景切换

## 7. 常见编辑操作

### 7.1 实体操作

- 复制实体：`Ctrl/Cmd + D`
- 删除实体：`Delete / Backspace`
- 图层上移/下移：工具栏实体菜单

### 7.2 工具切换

- `Q / W / E`：选择 / 移动 / 缩放
- 平移工具：工具栏 `pan`（非播放态）

### 7.3 场景文件

- 打开：场景菜单 -> 打开场景
- 保存：`Ctrl/Cmd + S`
- 另存：`Ctrl/Cmd + Shift + S`

## 8. 脚本最小示例

脚本生命周期：

- `onInit(ctx)`
- `onStart(ctx)`
- `onUpdate(ctx)`
- `onInteract(ctx)`（可交互对象）
- `onDestroy(ctx)`

示例：

```js
export default {
  onUpdate(ctx) {
    const move = ctx.api.input.getMoveVector(true)
    const tf = ctx.entity.getTransform()
    if (!tf) return
    tf.x += move.x * 120 * ctx.api.delta
    tf.y += move.y * 120 * ctx.api.delta
  }
}
```

常用 API：

- `ctx.api.input.*`（键鼠与动作映射）
- `ctx.api.findEntityByName(name)`
- `ctx.api.spawnEntity(entity)`
- `ctx.api.removeEntity(entity)`
- `ctx.api.switchScene(sceneName)`
- `ctx.api.isBlockedAt(x, y)`
- `ctx.api.isBlockedRect(cx, cy, halfW, halfH)`
- `ctx.api.setBackgroundTexture(path)`
- `ctx.api.cycleBackgroundTexture(paths)`

## 9. 排错建议

- 切换工程后预览没变化：
  - 当前版本已支持自动重载项目场景；若异常请先停止播放再重试切换。
- 播放态无法编辑：
  - 播放态默认禁用部分编辑工具，先停止播放后再改。
- 看不到调试信息：
  - 在播放按钮右侧打开“调试播放”。

## 10. 下一步建议

1. 为 Player 脚本增加技能冷却与音效。
2. 为 Enemy 增加受击反馈与动画事件。
3. 基于 Interactable + Script 扩展任务/道具交互逻辑。
