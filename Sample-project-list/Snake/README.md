# Snake Sample

[中文说明见下方](#中文说明)

A compact classic Snake example implemented with project-local scripts. It is designed as a small, readable project for learning runtime scripts, UI buttons, menus, input mapping, and simple game-state management.

## Features

- Classic grid-based Snake movement.
- Food spawning, scoring, best score, wall collision, and self collision.
- `Esc` pause menu.
- Automatic game-over menu when the snake hits a wall or itself.
- Difficulty button cycling through Easy, Normal, and Hard speed settings.
- Reset key bindings button powered by the project input API.
- No external image dependency: the board uses simple colored Sprite rectangles.

## Controls

- WASD / Arrow Keys: change direction.
- Esc: open or close the pause menu.
- Space / P: pause or resume without opening the full menu.
- R / Enter: restart.

## Where To Edit Gameplay

- `assets/scripts/shared/snake-game.js`: movement, food, scoring, pause, game over, difficulty, restart, rendering, and menu visibility.
- `assets/scripts/shared/snake-menu-action.js`: menu button behavior.
- `assets/scripts/InputState.ts`: key mapping.
- `scenes/Snake.scene.json`: prebuilt board, snake segment pool, food, HUD, and menu UI entities.

## 中文说明

这是一个紧凑的经典贪吃蛇示例，玩法逻辑完全放在项目内脚本中，适合学习运行时脚本、UI 按钮、菜单、输入映射和简单游戏状态管理。

## 功能

- 经典网格贪吃蛇移动。
- 食物生成、得分、最高分、撞墙和撞自己失败判定。
- `Esc` 暂停菜单。
- 撞墙或撞自己后自动弹出游戏结束菜单。
- 难度按钮可在简单、普通、困难之间循环切换，对应不同速度。
- 重置快捷键按钮通过项目输入 API 实现。
- 无外部图片依赖：场景使用简单彩色 Sprite 方块，便于检查和学习。

## 操作

- WASD / 方向键：改变方向。
- Esc：打开或关闭暂停菜单。
- Space / P：不打开完整菜单的暂停或继续。
- R / Enter：重新开始。

## 玩法脚本位置

- `assets/scripts/shared/snake-game.js`：移动、食物、得分、暂停、游戏结束、难度、重新开始、渲染和菜单显隐。
- `assets/scripts/shared/snake-menu-action.js`：菜单按钮行为。
- `assets/scripts/InputState.ts`：按键映射。
- `scenes/Snake.scene.json`：预制棋盘、蛇体节池、食物、HUD 和菜单 UI 实体。
