import { TransformComponent } from '../components/TransformComponent'
import { Component } from './Component'

export class Entity {
  id: string
  name: string
  parent: Entity | null = null
  children: Entity[] = []
  private components = new Map<string, Component>()

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  addComponent<T extends Component>(component: T): T {
    this.components.set(component.type, component)
    return component
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined
  }

  getAllComponents() {
    return Array.from(this.components.values())
  }

  getTransform() {
    return this.getComponent<TransformComponent>('Transform')
  }

  addChild(child: Entity) {
    child.parent = this
    this.children.push(child)
  }
}
