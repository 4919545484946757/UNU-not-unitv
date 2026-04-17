import { Scene } from './Scene'

export class Engine {
  currentScene: Scene | null = null

  loadScene(scene: Scene) {
    this.currentScene = scene
  }
}
