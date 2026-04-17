import { Component } from '../core/Component'

export class TransformComponent extends Component {
  readonly type = 'Transform'

  constructor(
    public x = 0,
    public y = 0,
    public scaleX = 1,
    public scaleY = 1,
    public rotation = 0,
    public anchorX = 0.5,
    public anchorY = 0.5,
    public zIndex = 0
  ) {
    super()
  }
}
