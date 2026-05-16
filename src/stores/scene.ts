import { defineStore } from 'pinia'
import type { Entity } from '../engine/core/Entity'
import type { Scene } from '../engine/core/Scene'
import type { SceneData } from '../engine/scene/sceneData'
import { serializeEntity } from '../engine/serialization/sceneSerializer'
import { useProjectStore } from './project'
import { sceneActions } from './sceneActions'

export const useSceneStore = defineStore('scene', {
  state: () => ({
    scenes: [] as Scene[],
    sceneDataList: [] as SceneData[],
    sceneFilePathById: {} as Record<string, string>,
    currentScene: null as Scene | null,
    currentSceneData: null as SceneData | null,
    revision: 0,
    isDirty: false,
    historyEntries: [] as string[],
    historyIndex: -1,
    historyTimer: 0 as number,
    isRestoringHistory: false,
    runtimeScene: null as Scene | null,
    runtimeRevision: 0,
    autoSaveEnabled: true,
    autoSaveIntervalSec: 20,
    autoSaveTimer: 0 as number,
    isAutoSaving: false,
    entityClipboard: null as ReturnType<typeof serializeEntity> | ReturnType<typeof serializeEntity>[] | null,
    folderClipboard: null as null | { sourcePath: string; entities: ReturnType<typeof serializeEntity>[]; folders: string[] }
  }),
  getters: {
    entities(state): Entity[] {
      return state.currentScene?.entities ?? []
    },
    sceneList(state): Array<{ id: string; name: string; entityCount: number; isCurrent: boolean }> {
      const currentId = state.currentScene?.id || ''
      return state.scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        entityCount: scene.entities.length,
        isCurrent: scene.id === currentId
      }))
    },
    canUndo(state) {
      return state.historyIndex > 0
    },
    canRedo(state) {
      return state.historyIndex >= 0 && state.historyIndex < state.historyEntries.length - 1
    }
  },
  actions: sceneActions
})
