import type { Scene } from '../core/Scene'
import type { ScriptConsoleMessage, ScriptRuntimeError } from '../runtime/ScriptRuntime'
import type { DebugOverlayOptions } from '../../stores/editor'
import type { ProjectRenderBackend } from '../../stores/project'
import type { EditorCameraSettings } from './EditorCameraController'

export type EditorTool = 'select' | 'move' | 'scale' | 'rotate' | 'pan'

export interface SceneRendererOptions {
  container: HTMLDivElement
  onEntitySelected?: (entityId: string, options?: { additive?: boolean; selectedEntityIds?: string[]; primaryId?: string; modelNodePath?: string }) => void
  onSceneMutated?: () => void
  onRuntimeSceneUpdated?: (scene: Scene | null) => void
  onScriptError?: (error: ScriptRuntimeError) => void
  onConsoleMessage?: (message: ScriptConsoleMessage) => void
}

export interface SceneRenderer {
  init(scene: Scene | null): Promise<void>
  renderScene(scene: Scene): Promise<void>
  setGridVisible(visible: boolean): void
  setDebugOverlayVisible(visible: boolean): void
  setDebugOverlayOptions?(options: DebugOverlayOptions): void
  setPlayDebugEnabled(enabled: boolean): void
  setRuntimeState(isPlaying: boolean, isPaused: boolean, scene: Scene | null, refreshPlayingScene?: boolean): Promise<void>
  hotReloadProjectRuntimeFiles(changedPath?: string): Promise<void>
  setSelections(entityIds: string[], primaryId?: string, modelNodePath?: string): void
  setTool(tool: EditorTool): void
  setEditorCameraSettings?(settings: Partial<EditorCameraSettings>): void
  setSelectedCameraFromEditorView?(entityId: string): boolean
  previewCameraView?(entityId: string): boolean
  exitCameraPreview?(): boolean
  zoomViewportByFactor(clientX: number, clientY: number, factor: number): void
  destroy(): void
}

export interface SceneRendererFactoryOptions extends SceneRendererOptions {
  backend: ProjectRenderBackend
}
