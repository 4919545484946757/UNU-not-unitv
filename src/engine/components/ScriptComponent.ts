import { Component } from '../core/Component'

export class ScriptComponent extends Component {
  readonly type = 'Script'

  constructor(
    public scriptPath = '',
    public sourceCode = '',
    public enabled = true,
    public instance: unknown = null,
    public initialized = false,
    public started = false
  ) {
    super()
  }
}
