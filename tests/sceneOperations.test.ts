import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { deserializeSceneData } from '../src/engine/serialization/sceneSerializer'
import {
  addEntity,
  deleteSceneFolder,
  duplicateEntity,
  moveEntitiesToLayerIndex,
  moveEntityLayer,
  moveEntityToFolder,
  removeEntity,
  renameSceneFolder,
  updateComponentField
} from '../src/engine/scene/sceneOperations'
import type { EntityData } from '../src/engine/scene/sceneData'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function readSceneData(name: string) {
  return deserializeSceneData(readFileSync(join(fixturesDir, name), 'utf8'))
}

function makeEntity(id: string): EntityData {
  return {
    id,
    name: id,
    components: [
      { type: 'Transform', data: { x: 0, y: 0, zIndex: 0 } }
    ]
  }
}

describe('SceneOperations', () => {
  it('adds, removes, and duplicates entities without Vue or Pinia', () => {
    const scene = readSceneData('minimal.scene.json')
    const added = addEntity(scene, makeEntity('Enemy'))
    const duplicated = duplicateEntity(added, 'Enemy', 'Enemy_Copy')
    const removed = removeEntity(duplicated.scene, 'Player')

    expect(scene.entities.map((entity) => entity.id)).toEqual(['Player'])
    expect(added.entities.map((entity) => entity.id)).toEqual(['Player', 'Enemy'])
    expect(duplicated.entity?.id).toBe('Enemy_Copy')
    expect(removed.entities.map((entity) => entity.id)).toEqual(['Enemy', 'Enemy_Copy'])
  })

  it('moves layers for single and multi-selection', () => {
    const scene = addEntity(addEntity(readSceneData('minimal.scene.json'), makeEntity('A')), makeEntity('B'))
    const moved = moveEntityLayer(scene, ['Player'], 2)
    const reordered = moveEntitiesToLayerIndex(moved, ['A', 'B'], 0)

    expect(moved.entities.map((entity) => entity.id)).toEqual(['A', 'B', 'Player'])
    expect(reordered.entities.map((entity) => entity.id)).toEqual(['A', 'B', 'Player'])
    expect(reordered.entities.map((entity) => entity.components[0].data.zIndex)).toEqual([0, 1, 2])
  })

  it('updates component fields and folder paths', () => {
    const scene = readSceneData('minimal.scene.json')
    const updated = updateComponentField(scene, 'Player', 'Transform', 'x', 128)
    const moved = moveEntityToFolder(updated, 'Player', 'Actors/Heroes')

    expect(updated.entities[0].components.find((component) => component.type === 'Transform')?.data.x).toBe(128)
    expect(moved.entities[0].sceneFolderPath).toBe('Actors/Heroes')
    expect(moved.sceneFolders).toContain('Actors/Heroes')
  })

  it('renames and deletes folders while synchronizing entity references', () => {
    const scene = readSceneData('minimal.scene.json')
    const renamed = renameSceneFolder(scene, 'Actors', 'Gameplay/Actors')
    const deleted = deleteSceneFolder(renamed, 'Gameplay/Actors')

    expect(renamed.entities[0].sceneFolderPath).toBe('Gameplay/Actors')
    expect(renamed.sceneFolders).toContain('Gameplay/Actors')
    expect(deleted.entities[0].sceneFolderPath).toBe('Gameplay')
  })
})
