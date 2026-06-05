import { defineStore } from 'pinia'

const MIN_LEFT_PANEL_WIDTH = 220
const MAX_LEFT_PANEL_WIDTH = 640
const MIN_RIGHT_PANEL_WIDTH = 240
const MAX_RIGHT_PANEL_WIDTH = 720
const COMPACT_MIN_LEFT_PANEL_WIDTH = 128
const COMPACT_MAX_LEFT_PANEL_WIDTH = 420
const COMPACT_MIN_RIGHT_PANEL_WIDTH = 140
const COMPACT_MAX_RIGHT_PANEL_WIDTH = 460
const MIN_BROWSER_PANEL_HEIGHT = 140
const MAX_BROWSER_PANEL_HEIGHT = 420
const MIN_CONSOLE_HEIGHT = 96
const MAX_CONSOLE_HEIGHT = 420
const COMPACT_MIN_BROWSER_PANEL_HEIGHT = 84
const COMPACT_MAX_BROWSER_PANEL_HEIGHT = 260
const COMPACT_MIN_CONSOLE_HEIGHT = 68
const COMPACT_MAX_CONSOLE_HEIGHT = 260

export const useEditorStore = defineStore('editor', {
  state: () => ({
    tool: 'select' as 'select' | 'move' | 'scale' | 'rotate' | 'pan',
    leftTab: 'Scene',
    sceneTreeViewMode: 'layer' as 'layer' | 'folder',
    rightTab: 'Inspector' as 'Inspector' | 'Script' | 'Timeline',
    entityJsonEditorEntityId: '',
    scriptErrorTarget: null as null | { path: string; line: number; column?: number; message?: string; nonce: number },
    scriptEditorExternalLock: null as null | { id: string; mode: string; targetId?: string; label?: string },
    showGrid: true,
    timelineFrameIndex: 0,
    timelinePreviewPlaying: false,
    timelinePreviewClock: 0,
    entityCreateDialogVisible: false,
    sceneListDialogVisible: false,
    keymapDialogVisible: false,
    leftPanelWidth: 300,
    rightPanelWidth: 340,
    assetBrowserHeight: 220,
    consoleHeight: 170,
    compactUi: false,
    showLeftPanel: true,
    showRightPanel: true,
    showAssetBrowserPanel: true,
    showBottomPanel: true,
    hideChromeDuringPlay: import.meta.env.VITE_UNU_ANDROID_EDITOR === '1'
  }),
  actions: {
    setTool(tool: 'select' | 'move' | 'scale' | 'rotate' | 'pan') {
      this.tool = tool
    },
    setRightTab(tab: 'Inspector' | 'Script' | 'Timeline') {
      this.rightTab = tab
    },
    setSceneTreeViewMode(mode: 'layer' | 'folder') {
      this.sceneTreeViewMode = mode
    },
    revealScriptError(path: string, line = 1, column?: number, message?: string) {
      const normalized = String(path || '').replace(/\\/g, '/').trim()
      if (!normalized) return
      this.leftTab = 'Assets'
      this.rightTab = 'Script'
      this.scriptErrorTarget = {
        path: normalized,
        line: Math.max(1, Math.round(Number(line) || 1)),
        column: Number.isFinite(column) ? Math.max(1, Math.round(Number(column))) : undefined,
        message,
        nonce: Date.now() + Math.random()
      }
    },
    openEntityJsonEditor(entityId: string) {
      this.entityJsonEditorEntityId = entityId
      this.rightTab = 'Script'
    },
    clearEntityJsonEditor() {
      this.entityJsonEditorEntityId = ''
    },
    lockScriptEditorExternal(payload: { id: string; mode: string; targetId?: string; label?: string }) {
      this.scriptEditorExternalLock = {
        id: payload.id,
        mode: payload.mode,
        targetId: payload.targetId || '',
        label: payload.label || ''
      }
    },
    unlockScriptEditorExternal(id?: string) {
      if (id && this.scriptEditorExternalLock?.id && this.scriptEditorExternalLock.id !== id) return
      this.scriptEditorExternalLock = null
    },
    setTimelineFrameIndex(index: number) {
      this.timelineFrameIndex = index
    },
    setTimelinePreviewPlaying(playing: boolean) {
      this.timelinePreviewPlaying = playing
      if (!playing) this.timelinePreviewClock = 0
    },
    setTimelinePreviewClock(value: number) {
      this.timelinePreviewClock = value
    },
    openEntityCreateDialog() {
      this.entityCreateDialogVisible = true
    },
    closeEntityCreateDialog() {
      this.entityCreateDialogVisible = false
    },
    openSceneListDialog() {
      this.sceneListDialogVisible = true
    },
    closeSceneListDialog() {
      this.sceneListDialogVisible = false
    },
    openKeymapDialog() {
      this.keymapDialogVisible = true
    },
    closeKeymapDialog() {
      this.keymapDialogVisible = false
    },
    toggleGrid() {
      this.showGrid = !this.showGrid
    },
    setCompactUi(compact: boolean) {
      this.compactUi = compact
      this.setLeftPanelWidth(this.leftPanelWidth)
      this.setRightPanelWidth(this.rightPanelWidth)
      this.setAssetBrowserHeight(this.assetBrowserHeight)
      this.setConsoleHeight(this.consoleHeight)
    },
    setLeftPanelWidth(width: number) {
      const min = this.compactUi ? COMPACT_MIN_LEFT_PANEL_WIDTH : MIN_LEFT_PANEL_WIDTH
      const max = this.compactUi ? COMPACT_MAX_LEFT_PANEL_WIDTH : MAX_LEFT_PANEL_WIDTH
      this.leftPanelWidth = Math.min(max, Math.max(min, Math.round(width)))
    },
    setRightPanelWidth(width: number) {
      const min = this.compactUi ? COMPACT_MIN_RIGHT_PANEL_WIDTH : MIN_RIGHT_PANEL_WIDTH
      const max = this.compactUi ? COMPACT_MAX_RIGHT_PANEL_WIDTH : MAX_RIGHT_PANEL_WIDTH
      this.rightPanelWidth = Math.min(max, Math.max(min, Math.round(width)))
    },
    setAssetBrowserHeight(height: number) {
      const min = this.compactUi ? COMPACT_MIN_BROWSER_PANEL_HEIGHT : MIN_BROWSER_PANEL_HEIGHT
      const max = this.compactUi ? COMPACT_MAX_BROWSER_PANEL_HEIGHT : MAX_BROWSER_PANEL_HEIGHT
      this.assetBrowserHeight = Math.min(max, Math.max(min, Math.round(height)))
    },
    setConsoleHeight(height: number) {
      const min = this.compactUi ? COMPACT_MIN_CONSOLE_HEIGHT : MIN_CONSOLE_HEIGHT
      const max = this.compactUi ? COMPACT_MAX_CONSOLE_HEIGHT : MAX_CONSOLE_HEIGHT
      this.consoleHeight = Math.min(max, Math.max(min, Math.round(height)))
    },
    setPanelVisible(panel: 'left' | 'right' | 'assets' | 'bottom', visible: boolean) {
      if (panel === 'left') this.showLeftPanel = visible
      else if (panel === 'right') this.showRightPanel = visible
      else if (panel === 'assets') this.showAssetBrowserPanel = visible
      else if (panel === 'bottom') this.showBottomPanel = visible
      window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    },
    setHideChromeDuringPlay(visible: boolean) {
      this.hideChromeDuringPlay = visible
      window.dispatchEvent(new CustomEvent('unu:layout-resize-end'))
    },
    togglePanelVisible(panel: 'left' | 'right' | 'assets' | 'bottom') {
      if (panel === 'left') this.setPanelVisible('left', !this.showLeftPanel)
      else if (panel === 'right') this.setPanelVisible('right', !this.showRightPanel)
      else if (panel === 'assets') this.setPanelVisible('assets', !this.showAssetBrowserPanel)
      else if (panel === 'bottom') this.setPanelVisible('bottom', !this.showBottomPanel)
    }
  }
})
