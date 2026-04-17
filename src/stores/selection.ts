import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    selectedEntityId: ''
  }),
  actions: {
    selectEntity(entityId: string) {
      this.selectedEntityId = entityId
    },
    clearSelection() {
      this.selectedEntityId = ''
    }
  }
})
