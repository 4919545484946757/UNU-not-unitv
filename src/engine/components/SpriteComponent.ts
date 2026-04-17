import { Component } from '../core/Component'

export class SpriteComponent extends Component {
  readonly type = 'Sprite'

  constructor(
    public texturePath = '',
    public width = 80,
    public height = 80,
    public visible = true,
    public alpha = 1,
    public tint = 0xffffff,
    public preserveAspect = true
  ) {
    super()
  }
}
