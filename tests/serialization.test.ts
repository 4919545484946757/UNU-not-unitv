import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { serializePrefab, deserializePrefab, instantiatePrefab } from '../src/engine/prefabs/prefabSerializer'
import { deserializeScene, serializeScene } from '../src/engine/serialization/sceneSerializer'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function readFixture(name: string) {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

describe('sceneSerializer', () => {
  for (const fixture of ['minimal.scene.json', 'prefab.scene.json', 'rich.scene.json']) {
    it(`round-trips ${fixture}`, () => {
      const scene = deserializeScene(readFixture(fixture))
      const roundTripped = deserializeScene(serializeScene(scene))

      expect(roundTripped.id).toBe(scene.id)
      expect(roundTripped.name).toBe(scene.name)
      expect(roundTripped.sceneFolders).toEqual(scene.sceneFolders)
      expect(roundTripped.entities.map((entity) => entity.id)).toEqual(scene.entities.map((entity) => entity.id))
      expect(roundTripped.entities.map((entity) => entity.getAllComponents().map((component) => component.type))).toEqual(
        scene.entities.map((entity) => entity.getAllComponents().map((component) => component.type))
      )
    })
  }
})

describe('prefabSerializer', () => {
  it('round-trips an entity tree and preserves prefab metadata', async () => {
    const scene = deserializeScene(readFixture('prefab.scene.json'))
    const root = scene.entities[0]
    const child = deserializeScene(readFixture('minimal.scene.json')).entities[0]
    child.id = 'EnemyChild'
    root.addChild(child)

    const rawPrefab = serializePrefab(root)
    const restored = deserializePrefab(rawPrefab)
    const instance = await instantiatePrefab(rawPrefab, 'EnemyRuntime', 'prefabs/Enemy.prefab.json')

    expect(restored.id).toBe(root.id)
    expect(restored.children[0].id).toBe('EnemyChild')
    expect(instance.id).toBe('EnemyRuntime')
    expect(instance.prefabSourcePath).toBe('prefabs/Enemy.prefab.json')
    expect(instance.children).toHaveLength(1)
  })
})
