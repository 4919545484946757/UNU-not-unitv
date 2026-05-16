import type { GameCommandRequest, SceneSwitchRequest } from './ScriptRuntimeCore'

export class RuntimeCommandQueue {
  private pendingSceneSwitch: SceneSwitchRequest | null = null
  private pendingGameCommand: GameCommandRequest | null = null

  requestSceneSwitch(request: SceneSwitchRequest) {
    this.pendingSceneSwitch = request
  }

  requestGameCommand(request: GameCommandRequest) {
    this.pendingGameCommand = request
  }

  consumeSceneSwitchRequest() {
    const next = this.pendingSceneSwitch
    this.pendingSceneSwitch = null
    return next
  }

  consumeGameCommandRequest() {
    const next = this.pendingGameCommand
    this.pendingGameCommand = null
    return next
  }

  clear() {
    this.pendingSceneSwitch = null
    this.pendingGameCommand = null
  }

  clearGameCommand() {
    this.pendingGameCommand = null
  }
}
