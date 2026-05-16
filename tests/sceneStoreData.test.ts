import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TransformComponent } from '../src/engine/components/TransformComponent'
import { Entity } from '../src/engine/core/Entity'
import { Scene } from '../src/engine/core/Scene'
import { sceneToData } from '../src/engine/serialization/sceneSerializer'
import { useProjectStore } from '../src/stores/project'
import { useSceneStore } from '../src/stores/scene'

describe('Scene store SceneData mirror', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('syncs SceneData when bootstrapping and mutating a scene', () => {
    const scene = new Scene('scene_store_data', 'Store Data')
    const player = new Entity('Player_001', 'Player')
    player.addComponent(new TransformComponent(10, 20))
    scene.addEntity(player)

    const store = useSceneStore()
    useProjectStore().setProject({ rootPath: 'unit-test-project', name: 'unit-test-project', mode: 'local' })
    store.bootstrap(scene)

    expect(store.currentSceneData?.id).toBe('scene_store_data')
    expect(store.currentSceneData?.entities.map((entity) => entity.id)).toEqual(['Player_001'])

    const enemy = new Entity('Enemy_001', 'Enemy')
    enemy.addComponent(new TransformComponent(30, 40))
    store.addEntity(enemy)

    expect(store.sceneDataList).toHaveLength(1)
    expect(store.currentSceneData?.entities.map((entity) => entity.id)).toEqual(['Player_001', 'Enemy_001'])
  })

  it('hydrates scenes from SceneData and keeps the DTO mirror current', () => {
    const scene = new Scene('scene_from_data', 'Scene From Data')
    const entity = new Entity('Entity_001', 'Entity')
    entity.addComponent(new TransformComponent(5, 6))
    scene.addEntity(entity)

    const store = useSceneStore()
    useProjectStore().setProject({ rootPath: 'unit-test-project', name: 'unit-test-project', mode: 'local' })

    store.replaceScenesFromData([sceneToData(scene)], 'scene_from_data')

    expect(store.currentScene?.id).toBe('scene_from_data')
    expect(store.currentScene?.getEntityById('Entity_001')?.name).toBe('Entity')
    expect(store.currentSceneData?.id).toBe('scene_from_data')
    expect(store.currentSceneData?.entities.map((item) => item.id)).toEqual(['Entity_001'])
  })
})
