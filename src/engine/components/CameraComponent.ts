import { Component } from '../core/Component'

export class CameraComponent extends Component {
  readonly type = 'Camera'

  constructor(
    public enabled = true,
    public zoom = 1,
    public followEntityId = '',
    public followSmoothing = 0.18,
    public offsetX = 0,
    public offsetY = 0,
    public boundsEnabled = false,
    public minX = -2000,
    public maxX = 2000,
    public minY = -2000,
    public maxY = 2000
  ) {
    super()
  }
}

