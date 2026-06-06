import { Component } from '../core/Component'

export type TransformPositionMode = 'world' | 'viewport'
export type ViewportHorizontalEdge = 'left' | 'center' | 'right'
export type ViewportVerticalEdge = 'top' | 'middle' | 'bottom'

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
    public zIndex = 0,
    public positionMode: TransformPositionMode = 'world',
    public viewportHorizontal: ViewportHorizontalEdge = 'center',
    public viewportVertical: ViewportVerticalEdge = 'middle',
    public z = 0,
    public scaleZ = 1,
    public rotationX = 0,
    public rotationY = 0,
    public rotationZ = 0
  ) {
    super()
  }
}
