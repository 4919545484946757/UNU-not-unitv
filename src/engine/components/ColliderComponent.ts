import { Component } from '../core/Component'

export class ColliderComponent extends Component {
  readonly type = 'Collider'

  constructor(
    public shape: 'rect' | 'circle' = 'rect',
    public width = 80,
    public height = 80,
    public offsetX = 0,
    public offsetY = 0,
    public isTrigger = false
  ) {
    super()
  }
}
