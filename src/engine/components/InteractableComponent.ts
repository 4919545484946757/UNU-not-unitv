import { Component } from '../core/Component'

export type InteractableActionType = 'none' | 'switchScene' | 'cycleTexture' | 'cycleTint' | 'scripted'
export type SceneStateMode = 'preserve' | 'reset'

export class InteractableComponent extends Component {
  readonly type = 'Interactable'

  constructor(
    public enabled = true,
    public interactDistance = 160,
    public actionType: InteractableActionType = 'none',
    public targetScene = '',
    public textureCycle: string[] = [],
    public tintCycle: number[] = [],
    public targetSpawnId = '',
    public sceneStateMode: SceneStateMode = 'preserve'
  ) {
    super()
  }
}
