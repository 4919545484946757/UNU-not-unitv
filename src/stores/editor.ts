import { defineStore } from 'pinia'

const MIN_LEFT_PANEL_WIDTH = 220
const MAX_LEFT_PANEL_WIDTH = 640
const MIN_RIGHT_PANEL_WIDTH = 240
const MAX_RIGHT_PANEL_WIDTH = 720
const MIN_BROWSER_PANEL_HEIGHT = 140
const MAX_BROWSER_PANEL_HEIGHT = 420

export const useEditorStore = defineStore('editor', {
  state: () => ({
    tool: 'select' as 'select' | 'move' | 'scale' | 'pan',
    leftTab: 'Scene',
    rightTab: 'Inspector' as 'Inspector' | 'Script' | 'Timeline',
    entityJsonEditorEntityId: '',
    showGrid: true,
    timelineFrameIndex: 0,
    timelinePreviewPlaying: false,
    timelinePreviewClock: 0,
    entityCreateDialogVisible: false,
    sceneListDialogVisible: false,
    leftPanelWidth: 300,
    rightPanelWidth: 340,
    assetBrowserHeight: 220
  }),
  actions: {
    setTool(tool: 'select' | 'move' | 'scale' | 'pan') {
      this.tool = tool
    },
    setRightTab(tab: 'Inspector' | 'Script' | 'Timeline') {
      this.rightTab = tab
    },
    openEntityJsonEditor(entityId: string) {
      this.entityJsonEditorEntityId = entityId
      this.rightTab = 'Script'
    },
    clearEntityJsonEditor() {
      this.entityJsonEditorEntityId = ''
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
    toggleGrid() {
      this.showGrid = !this.showGrid
    },
    setLeftPanelWidth(width: number) {
      this.leftPanelWidth = Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, Math.round(width)))
    },
    setRightPanelWidth(width: number) {
      this.rightPanelWidth = Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, Math.round(width)))
    },
    setAssetBrowserHeight(height: number) {
      this.assetBrowserHeight = Math.min(MAX_BROWSER_PANEL_HEIGHT, Math.max(MIN_BROWSER_PANEL_HEIGHT, Math.round(height)))
    }
  }
})
