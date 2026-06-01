import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    selectedEntityId: '',
    selectedEntityIds: [] as string[]
  }),
  getters: {
    selectedEntityIdSet(state) {
      return new Set(state.selectedEntityIds)
    },
    selectedCount(state) {
      return state.selectedEntityIds.length
    }
  },
  actions: {
    selectEntity(entityId: string) {
      const normalized = String(entityId || '').trim()
      if (this.selectedEntityId === normalized && this.selectedEntityIds.length === (normalized ? 1 : 0) && (!normalized || this.selectedEntityIds[0] === normalized)) return
      this.selectedEntityId = normalized
      this.selectedEntityIds = normalized ? [normalized] : []
    },
    selectEntities(entityIds: string[], primaryId?: string) {
      const unique = entityIds.map((id) => String(id || '').trim()).filter(Boolean).filter((id, index, list) => list.indexOf(id) === index)
      const primary = String(primaryId || '').trim()
      const nextPrimary = primary && unique.includes(primary) ? primary : (unique[unique.length - 1] || '')
      if (this.selectedEntityId === nextPrimary && this.selectedEntityIds.length === unique.length && this.selectedEntityIds.every((id, index) => id === unique[index])) return
      this.selectedEntityIds = unique
      this.selectedEntityId = nextPrimary
    },
    toggleEntity(entityId: string) {
      const normalized = String(entityId || '').trim()
      if (!normalized) return
      const next = this.selectedEntityIds.includes(normalized)
        ? this.selectedEntityIds.filter((id) => id !== normalized)
        : [...this.selectedEntityIds, normalized]
      this.selectEntities(next, next.includes(normalized) ? normalized : next[next.length - 1])
    },
    addEntity(entityId: string) {
      const normalized = String(entityId || '').trim()
      if (!normalized) return
      if (this.selectedEntityIds.includes(normalized)) {
        this.selectedEntityId = normalized
        return
      }
      this.selectedEntityIds = [...this.selectedEntityIds, normalized]
      this.selectedEntityId = normalized
    },
    removeEntity(entityId: string) {
      const normalized = String(entityId || '').trim()
      if (!normalized) return
      const next = this.selectedEntityIds.filter((id) => id !== normalized)
      this.selectEntities(next, this.selectedEntityId === normalized ? next[next.length - 1] : this.selectedEntityId)
    },
    clearSelection() {
      if (!this.selectedEntityId && this.selectedEntityIds.length === 0) return
      this.selectedEntityId = ''
      this.selectedEntityIds = []
    }
  }
})
