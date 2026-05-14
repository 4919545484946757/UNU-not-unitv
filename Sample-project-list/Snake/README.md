# Snake Sample

A compact classic Snake example implemented with project-local scripts.

## Controls

- WASD / Arrow Keys: change direction
- Space / P: pause or resume
- R / Enter: restart

## Where to edit gameplay

- `assets/scripts/shared/snake-game.js`: movement, food, scoring, pause, restart, rendering
- `assets/scripts/InputState.ts`: key mapping
- `scenes/Snake.scene.json`: prebuilt board, snake segment pool, food, and UI entities

The scene intentionally uses simple colored Sprite rectangles so the sample has no external image dependency and is easy to inspect.
