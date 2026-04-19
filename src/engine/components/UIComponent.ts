import { Component } from '../core/Component'

export type UIMode = 'text' | 'button'

export class UIComponent extends Component {
  readonly type = 'UI'

  constructor(
    public enabled = true,
    public mode: UIMode = 'text',
    public text = 'UI Text',
    public fontSize = 20,
    public textColor = 0xffffff,
    public width = 180,
    public height = 48,
    public backgroundColor = 0x2b3242,
    public anchorX = 0.5,
    public anchorY = 0.5,
    public interactable = true
  ) {
    super()
  }
}
