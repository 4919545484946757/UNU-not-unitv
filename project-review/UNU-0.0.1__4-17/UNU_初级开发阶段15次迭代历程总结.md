# UNU 轻量级 2D 游戏引擎开发历程（1~15阶段）

## 项目定位

UNU 是一个基于：

- Vue 3
- Vite
- Electron
- PixiJS

开发的轻量级 2D 游戏引擎编辑器。

目标是：

- 面向小型 2D 游戏开发
- 提供可视化编辑器
- 支持资源管理、场景编辑、脚本逻辑、动画系统
- 最终形成类似 Unity/Godot 的轻量桌面编辑器

---

# 第1阶段：项目骨架初始化

## 完成内容

搭建整体工程结构：

- Electron 主进程
- Vue3 编辑器界面
- PixiJS 渲染视口
- 左中右三栏布局

## 编辑器布局

### 左侧

- 资源树
- 场景树
- 素材箱

### 中央

- Pixi 可视化预览区

### 右侧

- Inspector
- Script
- Timeline

---

# 第2阶段：资源系统与 Inspector 联动

## 新增

### AssetDatabase

资源系统骨架：

- 资源树递归结构
- 素材箱联动
- Inspector 修改实体属性

## 视口交互

支持：

- 点击选中实体
- 拖拽移动实体
- 网格显示

## 脚本生命周期

加入：

```ts
onInit()
onStart()
onUpdate()
onDestroy()
```

并实现：

- builtin://spin
- builtin://patrol

---

# 第3阶段：工程目录与场景存储

## 新增 Electron IPC

实现：

- 打开工程
- 扫描目录
- 保存场景
- 打开场景

## 场景系统

支持：

```json
.scene.json
```

可：

- 保存
- 加载
- 重新打开

## 本地工程结构

自动生成：

```txt
assets/
scenes/
prefabs/
```

---

# 第4阶段：真实图片资源接入

## 图片导入

新增：

- 导入图片
- 自动复制到工程目录

## Pixi 真实贴图

Sprite 不再是占位色块：

- 支持真实图片纹理
- 支持缩略图预览

## Prefab

新增：

```json
.prefab.json
```

支持：

- 保存 Prefab
- 实例化 Prefab

---

# 第5阶段：Pixi unsafe-eval 修复

## 问题

Electron CSP 导致：

```txt
Current environment does not allow unsafe-eval
```

## 修复

加入：

```ts
import 'pixi.js/unsafe-eval'
```

并完善：

- 视口初始化异常处理
- mounted hook 保护

---

# 第6阶段：动画系统与 Gizmo

## AnimationComponent

新增：

- framePaths
- fps
- loop
- playing

## Gizmo

支持：

- 移动
- 缩放
- 选框显示

---

# 第7阶段：动画资源系统

## 动画资源

新增：

```json
.anim.json
```

## Timeline

支持：

- 帧列表
- FPS 编辑
- Loop
- 删除帧
- 添加帧

## 图集入口

新增：

```json
.atlas.json
```

---

# 第8阶段：图集渲染与事件轨道

## 图集裁切

支持：

```txt
atlas://path#x,y,w,h
```

## Timeline 播放头

支持：

- 播放
- 停止
- 时间滑杆

## 动画事件

新增事件轨道：

- eventName
- payload

---

# 第9阶段：素材直接创建实体

## 新功能

双击图片资源：

自动：

- 创建 Sprite 实体
- 添加 Transform
- 添加 Sprite
- 自动选中

---

# 第10阶段：播放预览修复

## 问题

点击播放：

- 所有实体消失
- 停止后恢复

## 根因

播放态：

- 每帧异步重建场景
- 编辑态直接参与运行逻辑

## 修复

改为：

### 编辑态

只负责编辑

### 运行态

运行克隆副本：

```txt
编辑场景
   ↓ clone
运行场景
```

---

# 第11阶段：Electron ESM 修复

## 问题

```txt
__dirname is not defined
```

## 修复

改为：

```ts
import { fileURLToPath } from 'url'
```

并加入：

- unhandledRejection
- uncaughtException

---

# 第12阶段：项目与实体管理

## 新建项目

自动生成：

```txt
assets/
assets/images/
assets/audio/
assets/scripts/
assets/animations/
scenes/
prefabs/
project.json
```

## 新建场景

支持：

- MainScene
- 场景切换

## 新建实体

默认添加：

- Transform
- Sprite
- Collider

---

# 第13阶段：右键菜单与文件树折叠

## 资源树右键菜单

支持：

- 导入图片
- 刷新资源
- 创建 Sprite
- 打开场景
- 实例化 Prefab

## 场景树右键菜单

支持：

- 新建实体
- 删除
- 复制
- 图层调整

## 文件树折叠

支持：

- 展开
- 折叠
- 全部展开
- 全部折叠

---

# 第14阶段：布局与渲染修复

## 修复贴图渲染

解决：

- 图片加载后不显示
- 出生点错误
- Texture 未准备完成

## 边栏增强

左右边栏支持：

- 横向滚动
- 纵向滚动

## 拖动调整大小

支持：

- 左边栏宽度调整
- 右边栏宽度调整

---

# 第15阶段：布局系统修复

## 修复问题

左侧栏拖动后：

- 渲染区覆盖右边栏

## 修复内容

加入：

- min-width
- overflow hidden
- 中间视口宽度约束

## 新功能

素材箱支持：

- 上下拖拽调整高度

---

# 当前项目状态

UNU 已从：

```txt
空编辑器 UI
```

发展为：

```txt
具备基础可用性的 2D 游戏编辑器原型
```
