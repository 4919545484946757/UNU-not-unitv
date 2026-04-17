import { Entity } from './Entity'

export class Scene {
  readonly id: string
  name: string
  entities: Entity[] = []

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  addEntity(entity: Entity) {
    this.entities.push(entity)
    this.syncZIndices()
  }

  getEntityById(id: string) {
    return this.entities.find((entity) => entity.id === id)
  }

  removeEntityById(id: string) {
    const index = this.entities.findIndex((entity) => entity.id === id)
    if (index < 0) return false
    this.entities.splice(index, 1)
    this.syncZIndices()
    return true
  }

  moveEntityLayer(id: string, delta: number) {
    const index = this.entities.findIndex((entity) => entity.id === id)
    if (index < 0) return false

    const targetIndex = Math.max(0, Math.min(this.entities.length - 1, index + delta))
    if (targetIndex === index) return false

    const [entity] = this.entities.splice(index, 1)
    this.entities.splice(targetIndex, 0, entity)
    this.syncZIndices()
    return true
  }

  private syncZIndices() {
    this.entities.forEach((entity, index) => {
      const transform = entity.getTransform?.()
      if (transform) transform.zIndex = index
    })
  }
}
