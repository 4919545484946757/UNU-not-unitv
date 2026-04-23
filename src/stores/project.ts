import { defineStore } from 'pinia'

export const useProjectStore = defineStore('project', {
  state: () => ({
    rootPath: 'sample-project',
    name: 'sample-project',
    sampleProjectId: 'action-2d',
    currentScenePath: '',
    statusMessage: '正在使用示例工程数据',
    lastSavedAt: '',
    statusPopupVisible: true,
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
      this.statusPopupVisible = true
    },
    toggleStatusPopup() {
      this.statusPopupVisible = !this.statusPopupVisible
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
      this.statusPopupVisible = true
    }
  }
})
