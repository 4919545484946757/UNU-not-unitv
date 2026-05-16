import { describe, expect, it, vi } from 'vitest'
import { ScriptComponent } from '../src/engine/components/ScriptComponent'
import { TransformComponent } from '../src/engine/components/TransformComponent'
import { Entity } from '../src/engine/core/Entity'
import { Scene } from '../src/engine/core/Scene'
import { InputState } from '../src/engine/runtime/InputState'
import { ScriptRuntime, type ScriptConsoleMessage, type ScriptRuntimeError } from '../src/engine/runtime/ScriptRuntime'

describe('InputState', () => {
  it('merges default, project, and user action maps in the expected priority order', () => {
    const input = new InputState({ jump: ['Space'], fire: ['Mouse0'] })
    input.setProjectRuntimeSource(`
      export default {
        actionMap: {
          jump: ['KeyK'],
          interact: ['KeyF']
        }
      }
    `)

    expect(input.getActionMap()).toEqual({
      jump: ['KeyK'],
      fire: ['Mouse0'],
      interact: ['KeyF']
    })

    input.setActionBindings('jump', ['KeyJ'])
    expect(input.getActionMap().jump).toEqual(['KeyJ'])
  })

  it('uses project action map bindings for input queries', () => {
    const input = new InputState({ jump: ['Space'] })
    input.setProjectRuntimeSource(`export default { actionMap: { jump: ['KeyK'] } }`)
    input.attach()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK' }))

    expect(input.isActionDown('jump')).toBe(true)

    input.detach()
  })
})

describe('ScriptRuntime', () => {
  it('invokes hooks and reports script errors with source path and line', () => {
    const scene = new Scene('scene_runtime', 'Runtime')
    const entity = new Entity('Entity_001', 'Actor')
    entity.addComponent(new TransformComponent())
    entity.addComponent(new ScriptComponent('assets/scripts/test-hook.js', '', true))
    scene.addEntity(entity)

    const logs: ScriptConsoleMessage[] = []
    const errors: ScriptRuntimeError[] = []
    const runtime = new ScriptRuntime()
    runtime.setConsoleReporter((message) => logs.push(message))
    runtime.setErrorReporter((error) => errors.push(error))
    runtime.setProjectRuntimeSources([
      {
        path: 'assets/scripts/ScriptRuntime.ts',
        content: `
          export default {
            scripts: {
              'assets/scripts/test-hook.js': {
                onInit(ctx) {
                  ctx.api.log('[hook] init')
                },
                onStart(ctx) {
                  ctx.entity.name = 'Started'
                },
                onUpdate() {
                  throw new Error('boom')
                }
              }
            }
          }
        `
      }
    ])

    runtime.initScene(scene)
    runtime.startScene(scene)
    runtime.updateScene(scene, 1 / 60)

    expect(entity.name).toBe('Started')
    expect(logs.some((message) => message.message === '[hook] init')).toBe(true)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('boom')
    expect(errors[0].scriptPath).toBe('assets/scripts/ScriptRuntime.ts')
    expect(errors[0].line).toBeGreaterThan(1)
  })

  it('reports compile errors with the project runtime file path', () => {
    const errors: ScriptRuntimeError[] = []
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const runtime = new ScriptRuntime()
    runtime.setErrorReporter((error) => errors.push(error))

    runtime.setProjectRuntimeSources([
      {
        path: 'assets/scripts/BrokenRuntime.ts',
        content: `export default { scripts: { broken: { onUpdate() { const value = ; } } } }`
      }
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].scriptPath).toBe('assets/scripts/BrokenRuntime.ts')
    expect(errors[0].phase).toBe('compile')
    expect(errors[0].line).toBeGreaterThanOrEqual(1)
    warn.mockRestore()
  })
})
