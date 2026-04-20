import { Component } from '../core/Component'

export type InteractableActionType = 'none' | 'switchScene' | 'cycleTexture' | 'cycleTint'

export class InteractableComponent extends Component {
  readonly type = 'Interactable'

  constructor(
    public enabled = true,
    public interactDistance = 160,
    public actionType: InteractableActionType = 'none',
    public targetScene = '',
    public textureCycle: string[] = [],
    public tintCycle: number[] = []
  ) {
    super()
  }
}

