import { defineStore } from 'pinia'
import { useConsoleStore } from './console'

export type StatusLogCategory =
  | 'project'
  | 'scene'
  | 'asset'
  | 'entity'
  | 'script'
  | 'runtime'
  | 'tool'
  | 'prefab'
  | 'animation'
  | 'tilemap'
  | 'ui'
  | 'fileSystem'
  | 'error'
  | 'other'

export const STATUS_LOG_CATEGORY_LABELS: Record<StatusLogCategory, string> = {
  project: '项目/工程',
  scene: '场景',
  asset: '资源',
  entity: '实体',
  script: '脚本',
  runtime: '播放/运行',
  tool: '工具',
  prefab: 'Prefab',
  animation: '动画',
  tilemap: 'Tilemap',
  ui: 'UI',
  fileSystem: '文件系统',
  error: '错误/失败',
  other: '其它'
}

const DEFAULT_STATUS_LOG_FILTERS: Record<StatusLogCategory, boolean> = {
  project: true,
  scene: true,
  asset: true,
  entity: true,
  script: true,
  runtime: true,
  tool: true,
  prefab: true,
  animation: true,
  tilemap: true,
  ui: true,
  fileSystem: true,
  error: true,
  other: true
}

export const STATUS_LOG_CATEGORIES = Object.keys(STATUS_LOG_CATEGORY_LABELS) as StatusLogCategory[]

export const useProjectStore = defineStore('project', {
  state: () => ({
    rootPath: 'sample-project',
    name: 'sample-project',
    sampleProjectId: 'action-2d',
    currentScenePath: '',
    statusMessage: '正在使用示例工程数据',
    lastSavedAt: '',
    statusPopupVisible: false,
    statusConsoleVisible: true,
    statusConsoleFilters: { ...DEFAULT_STATUS_LOG_FILTERS },
    statusPopupX: 0,
    statusPopupY: 0
  }),
  actions: {
    setProject(payload: { rootPath: string; name: string; sampleProjectId?: string }) {
      this.rootPath = payload.rootPath
      this.name = payload.name
      this.sampleProjectId = payload.sampleProjectId || ''
      this.currentScenePath = ''
      this.statusMessage = `已打开工程：${payload.name}`
    },
    resetSceneFile() {
      this.currentScenePath = ''
    },
    setSceneFile(filePath: string) {
      this.currentScenePath = filePath
    },
    setStatus(message: string) {
      this.statusMessage = message
      this.emitStatusToConsole(message)
    },
    toggleStatusPopup() {
      this.statusConsoleVisible = !this.statusConsoleVisible
    },
    closeStatusPopup() {
      this.statusPopupVisible = false
    },
    setStatusPopupPosition(payload: { x: number; y: number }) {
      this.statusPopupX = Math.round(payload.x)
      this.statusPopupY = Math.round(payload.y)
    },
    markSaved() {
      this.lastSavedAt = new Date().toLocaleTimeString()
      this.statusMessage = this.lastSavedAt ? `已保存 ${this.lastSavedAt}` : '已保存'
      this.emitStatusToConsole(this.statusMessage)
    },
    emitStatusToConsole(message: string) {
      if (!this.statusConsoleVisible) return
      const category = classifyStatusMessage(message)
      if (!this.statusConsoleFilters[category]) return
      useConsoleStore().log(message, { source: `Status/${STATUS_LOG_CATEGORY_LABELS[category]}` })
    },
    setStatusConsoleFilter(category: StatusLogCategory, enabled: boolean) {
      this.statusConsoleFilters[category] = enabled
    },
    toggleStatusConsoleFilter(category: StatusLogCategory) {
      this.statusConsoleFilters[category] = !this.statusConsoleFilters[category]
    },
    setAllStatusConsoleFilters(enabled: boolean) {
      for (const category of STATUS_LOG_CATEGORIES) {
        this.statusConsoleFilters[category] = enabled
      }
    }
  }
})

export function classifyStatusMessage(message: string): StatusLogCategory {
  const text = String(message || '').toLowerCase()
  if (/[失败错误异常]|fail|error/.test(text)) return 'error'
  if (/tilemap|tile map|瓦片|图形窗口|tiles|collision/.test(text)) return 'tilemap'
  if (/prefab|预制/.test(text)) return 'prefab'
  if (/动画|animation|图集|时间轴/.test(text)) return 'animation'
  if (/脚本|script|热重载/.test(text)) return 'script'
  if (/播放|预览|运行态|fps|场景切换|runtime/.test(text)) return 'runtime'
  if (/工具切换|选择|移动|缩放|平移|工具/.test(text)) return 'tool'
  if (/实体|entity|图层/.test(text)) return 'entity'
  if (/场景|scene/.test(text)) return 'scene'
  if (/资源|素材|图片|音频|贴图|asset|导入|依赖/.test(text)) return 'asset'
  if (/文件|目录|文件夹|保存|打开|另存|重命名|删除|新建文件/.test(text)) return 'fileSystem'
  if (/ui|按钮|html/.test(text)) return 'ui'
  if (/项目|工程|导出|新建工程|打开工程|另存/.test(text)) return 'project'
  return 'other'
}
