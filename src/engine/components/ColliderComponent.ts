import { Component } from '../core/Component'

export type CollisionLayer =
  | 'Default'
  | 'Player'
  | 'Enemy'
  | 'World'
  | 'Door'
  | 'Pickup'
  | 'Trap'
  | 'Attack'
  | 'Sensor'
  | 'UI'

export const COLLISION_LAYERS: CollisionLayer[] = [
  'Default',
  'Player',
  'Enemy',
  'World',
  'Door',
  'Pickup',
  'Trap',
  'Attack',
  'Sensor',
  'UI'
]

export const DEFAULT_COLLISION_MASKS: Record<CollisionLayer, CollisionLayer[]> = {
  Default: ['Default', 'Player', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Attack', 'Sensor'],
  Player: ['Default', 'Enemy', 'World', 'Door', 'Pickup', 'Trap', 'Sensor'],
  Enemy: ['Default', 'Player', 'World', 'Attack', 'Trap', 'Sensor'],
  World: ['Default', 'Player', 'Enemy'],
  Door: ['Player'],
  Pickup: ['Player'],
  Trap: ['Player', 'Enemy'],
  Attack: ['Enemy', 'Default'],
  Sensor: ['Player', 'Enemy', 'Default'],
  UI: []
}

export type ColliderShape = 'rect' | 'circle' | 'box' | 'sphere' | 'capsule'

export class ColliderComponent extends Component {
  readonly type = 'Collider'

  constructor(
    public shape: ColliderShape = 'rect',
    public width = 80,
    public height = 80,
    public offsetX = 0,
    public offsetY = 0,
    public isTrigger = false,
    public layer: CollisionLayer = 'Default',
    public collidesWith: CollisionLayer[] = [...DEFAULT_COLLISION_MASKS.Default],
    public showDebugFrame = true,
    public depth = 80,
    public radius = 40,
    public capsuleHeight = 120,
    public offsetZ = 0
  ) {
    super()
  }
}
