import type { Scene } from '../core/Scene'
import type { ScriptConsoleMessage, ScriptRuntimeError } from '../runtime/ScriptRuntime'
import type { ProjectRenderBackend } from '../../stores/project'

export type EditorTool = 'select' | 'move' | 'scale' | 'rotate' | 'pan'

export interface SceneRendererOptions {
  container: HTMLDivElement
  onEntitySelected?: (entityId: string, options?: { additive?: boolean; selectedEntityIds?: string[]; primaryId?: string }) => void
  onSceneMutated?: () => void
  onRuntimeSceneUpdated?: (scene: Scene | null) => void
  onScriptError?: (error: ScriptRuntimeError) => void
  onConsoleMessage?: (message: ScriptConsoleMessage) => void
}

export interface SceneRenderer {
  init(scene: Scene | null): Promise<void>
  renderScene(scene: Scene): Promise<void>
  setGridVisible(visible: boolean): void
  setPlayDebugEnabled(enabled: boolean): void
  setRuntimeState(isPlaying: boolean, isPaused: boolean, scene: Scene | null, refreshPlayingScene?: boolean): Promise<void>
  hotReloadProjectRuntimeFiles(changedPath?: string): Promise<void>
  setSelections(entityIds: string[], primaryId?: string): void
  setTool(tool: EditorTool): void
  zoomViewportByFactor(clientX: number, clientY: number, factor: number): void
  destroy(): void
}

export interface SceneRendererFactoryOptions extends SceneRendererOptions {
  backend: ProjectRenderBackend
}
