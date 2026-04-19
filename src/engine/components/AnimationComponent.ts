import { Component } from '../core/Component'

export interface AnimationFrameData {
  texturePath: string
  duration: number
}

export interface AnimationEventData {
  frame: number
  name: string
  payload?: string
}

export interface AnimationAtlasGrid {
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  frameCount: number
}

export interface TransformTrackPoint {
  frame: number
  value: number
}

export interface TransformTracks {
  positionX: TransformTrackPoint[]
  positionY: TransformTrackPoint[]
  rotation: TransformTrackPoint[]
}

export interface AnimationStateClip {
  name: string
  framePaths: string[]
  frameDurations: number[]
  loop: boolean
}

export interface AnimationStateTransition {
  from: string
  to: string
  condition: 'always' | 'ifMoving' | 'ifNotMoving' | 'ifActionDown' | 'ifActionUp'
  action?: string
  priority?: number
  canInterrupt?: boolean
  once?: boolean
  minNormalizedTime?: number
}

export interface AnimationStateMachine {
  enabled: boolean
  initialState: string
  currentState: string
  clips: AnimationStateClip[]
  transitions: AnimationStateTransition[]
}

export class AnimationComponent extends Component {
  readonly type = 'Animation'

  constructor(
    public enabled = true,
    public playing = true,
    public fps = 8,
    public loop = true,
    public currentFrame = 0,
    public elapsed = 0,
    public framePaths: string[] = [],
    public frameDurations: number[] = [],
    public animationAssetPath = '',
    public sourceAtlasPath = '',
    public atlasGrid: AnimationAtlasGrid | null = null,
    public frameEvents: AnimationEventData[] = [],
    public transformTracks: TransformTracks = { positionX: [], positionY: [], rotation: [] },
    public stateMachine: AnimationStateMachine = {
      enabled: false,
      initialState: 'Idle',
      currentState: '',
      clips: [],
      transitions: []
    }
  ) {
    super()
  }
}
