import { Component } from '../core/Component'

export type UIMode = 'text' | 'button' | 'slider'
export type UIRenderMode = 'pixi' | 'html'
export type UILayoutMode = 'none' | 'vertical' | 'horizontal'

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
    public interactable = true,
    public markdownEnabled = false,
    public renderMode: UIRenderMode = 'pixi',
    public onClickScriptPath = '',
    public sliderValue = 1,
    public sliderMin = 0,
    public sliderMax = 1,
    public parentId = '',
    public layout: UILayoutMode = 'none',
    public layoutGap = 8,
    public paddingX = 14,
    public paddingY = 8,
    public autoWidth = false,
    public autoHeight = false,
    public minWidth = 1,
    public minHeight = 1
  ) {
    super()
  }
}
