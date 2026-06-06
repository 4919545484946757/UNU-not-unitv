import { Component } from '../core/Component'

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic'

export class PhysicsBodyComponent extends Component {
  readonly type = 'PhysicsBody'

  constructor(
    public bodyType: PhysicsBodyType = 'dynamic',
    public mass = 1,
    public useGravity = true,
    public damping = 0.08,
    public velocityX = 0,
    public velocityY = 0,
    public velocityZ = 0,
    public angularVelocityX = 0,
    public angularVelocityY = 0,
    public angularVelocityZ = 0,
    public lockedRotation = false,
    public enabled = true
  ) {
    super()
  }
}
