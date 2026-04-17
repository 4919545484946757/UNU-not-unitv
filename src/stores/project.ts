import { defineStore } from 'pinia'

export const useProjectStore = defineStore('project', {
  state: () => ({
    rootPath: 'sample-project',
    name: 'sample-project',
    currentScenePath: '',
    statusMessage: '正在使用示例工程数据',
    lastSavedAt: ''
  }),
  actions: {
    setProject(payload: { rootPath: string; name: string }) {
      this.rootPath = payload.rootPath
      this.name = payload.name
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
    },
    markSaved() {
      this.lastSavedAt = new Date().toLocaleTimeString()
      this.statusMessage = this.lastSavedAt ? `已保存 ${this.lastSavedAt}` : '已保存'
    }
  }
})
