import { Component } from '../core/Component'

export type AudioGroup = 'bgm' | 'sfx' | 'ui'

export class AudioComponent extends Component {
  readonly type = 'Audio'

  constructor(
    public enabled = true,
    public clipPath = '',
    public group: AudioGroup = 'sfx',
    public volume = 1,
    public loop = false,
    public playOnStart = false,
    public playing = false
  ) {
    super()
  }
}
