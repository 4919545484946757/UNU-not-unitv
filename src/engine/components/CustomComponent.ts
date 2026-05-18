import { Component } from '../core/Component'

export class CustomComponent extends Component {
  constructor(
    public readonly type: string,
    public data: Record<string, unknown> = {}
  ) {
    super()
  }
}
