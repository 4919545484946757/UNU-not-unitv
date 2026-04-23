import { Component } from '../core/Component'

export type BackgroundFitMode = 'cover' | 'contain'

export class BackgroundComponent extends Component {
  readonly type = 'Background'

  constructor(
    public enabled = true,
    public followCamera = true,
    public fitMode: BackgroundFitMode = 'cover'
  ) {
    super()
  }
}

