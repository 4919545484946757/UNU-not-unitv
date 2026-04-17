import { ScriptComponent } from '../components/ScriptComponent'
import type { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'

interface RuntimeInput {
  isKeyDown: (code: string) => boolean
  isMouseDown: (button?: number) => boolean
  isActionDown: (action: string) => boolean
  getAxis: (axis: 'horizontal' | 'vertical') => number
  getMousePosition: () => { x: number; y: number }
}

export interface ScriptContext {
  entity: Entity
  api: {
    delta: number
    time: number
    getState: <T extends Record<string, unknown>>(entity: Entity) => T
    input: RuntimeInput
  }
}

export interface ScriptHooks {
  onInit?: (ctx: ScriptContext) => void
  onStart?: (ctx: ScriptContext) => void
  onUpdate?: (ctx: ScriptContext) => void
  onDestroy?: (ctx: ScriptContext) => void
}

const scriptRegistry: Record<string, ScriptHooks> = {
  'builtin://patrol': {
    onInit: ({ entity, api }) => {
      const state = api.getState<{ dir?: number; startX?: number }>(entity)
      state.dir = 1
      state.startX = entity.getTransform()?.x ?? 0
    },
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      const state = api.getState<{ dir?: number; startX?: number }>(entity)
      const startX = Number(state.startX ?? transform.x)
      let dir = Number(state.dir ?? 1)
      transform.x += dir * 80 * api.delta
      if (transform.x > startX + 100) dir = -1
      if (transform.x < startX - 100) dir = 1
      state.dir = dir
    }
  },
  'builtin://spin': {
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      transform.rotation += 1.5 * api.delta
    }
  },
  'builtin://player-input': {
    onUpdate: ({ entity, api }) => {
      const transform = entity.getTransform()
      if (!transform) return
      const speed = api.input.isActionDown('fire') ? 220 : 140
      const vx = api.input.getAxis('horizontal')
      const vy = api.input.getAxis('vertical')
      if (vx !== 0 || vy !== 0) {
        transform.x += vx * speed * api.delta
        transform.y += vy * speed * api.delta
      }
    }
  }
}

export class ScriptRuntime {
  private readonly entityState = new Map<string, Record<string, unknown>>()
  private elapsed = 0
  private input: RuntimeInput = {
    isKeyDown: () => false,
    isMouseDown: () => false,
    isActionDown: () => false,
    getAxis: () => 0,
    getMousePosition: () => ({ x: 0, y: 0 })
  }

  initScene(scene: Scene) {
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      if (!script || !script.enabled) continue
      const hooks = scriptRegistry[script.scriptPath]
      script.instance = hooks ?? null
      if (!hooks || script.initialized) continue
      hooks.onInit?.(this.createContext(entity, 0))
      script.initialized = true
    }
  }

  startScene(scene: Scene) {
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled || script.started) continue
      hooks.onStart?.(this.createContext(entity, 0))
      script.started = true
    }
  }

  updateScene(scene: Scene, delta: number, input?: RuntimeInput) {
    this.elapsed += delta
    if (input) this.input = input
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks || !script.enabled) continue
      hooks.onUpdate?.(this.createContext(entity, delta))
    }
  }

  destroyScene(scene: Scene) {
    for (const entity of scene.entities) {
      const script = entity.getComponent<ScriptComponent>('Script')
      const hooks = script?.instance as ScriptHooks | null
      if (!script || !hooks) continue
      hooks.onDestroy?.(this.createContext(entity, 0))
      script.instance = null
      script.initialized = false
      script.started = false
    }
    this.entityState.clear()
    this.elapsed = 0
  }

  private createContext(entity: Entity, delta: number): ScriptContext {
    return {
      entity,
      api: {
        delta,
        time: this.elapsed,
        getState: <T extends Record<string, unknown>>(target: Entity) => {
          if (!this.entityState.has(target.id)) this.entityState.set(target.id, {})
          return this.entityState.get(target.id) as T
        },
        input: this.input
      }
    }
  }
}
