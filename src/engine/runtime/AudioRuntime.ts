import type { AudioGroup } from '../components/AudioComponent'
import { AudioComponent } from '../components/AudioComponent'
import type { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'

type ManagedAudio = {
  entityId: string
  clipPath: string
  group: AudioGroup
  baseVolume: number
  loop: boolean
  element: HTMLAudioElement
}

type PlayOneShotOptions = {
  group?: AudioGroup
  volume?: number
  loop?: boolean
}

export class AudioRuntime {
  private readonly managedByEntity = new Map<string, ManagedAudio>()
  private readonly oneShotAudios = new Set<HTMLAudioElement>()
  private readonly dataUrlCache = new Map<string, Promise<string | null>>()
  private masterVolume = 1
  private groupVolumes: Record<AudioGroup, number> = { bgm: 0.8, sfx: 1, ui: 1 }
  private projectRoot = ''
  private paused = false

  setProjectRoot(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  setPaused(paused: boolean) {
    this.paused = paused
    for (const managed of this.managedByEntity.values()) {
      if (paused) {
        managed.element.pause()
      } else if (managed.element.paused) {
        void managed.element.play().catch(() => undefined)
      }
    }
    if (paused) {
      for (const oneShot of this.oneShotAudios) oneShot.pause()
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = clamp01(volume)
    this.refreshVolumes()
  }

  getMasterVolume() {
    return this.masterVolume
  }

  setGroupVolume(group: AudioGroup, volume: number) {
    this.groupVolumes[group] = clamp01(volume)
    this.refreshVolumes()
  }

  getGroupVolume(group: AudioGroup) {
    return this.groupVolumes[group] ?? 1
  }

  async playOneShot(clipPath: string, options: PlayOneShotOptions = {}) {
    const source = await this.resolveAudioSource(clipPath)
    if (!source) return null
    const group: AudioGroup = options.group ?? 'sfx'
    const baseVolume = clamp01(options.volume ?? 1)
    const audio = new Audio(source)
    audio.preload = 'auto'
    audio.loop = Boolean(options.loop)
    audio.volume = this.computeVolume(group, baseVolume)
    this.oneShotAudios.add(audio)
    audio.addEventListener('ended', () => {
      this.oneShotAudios.delete(audio)
    }, { once: true })
    audio.addEventListener('error', () => {
      this.oneShotAudios.delete(audio)
    }, { once: true })
    if (!this.paused) {
      await audio.play().catch(() => undefined)
    }
    return audio
  }

  async playEntityAudio(entity: Entity) {
    const audioComp = entity.getComponent<AudioComponent>('Audio')
    if (!audioComp || !audioComp.enabled) return
    const source = await this.resolveAudioSource(audioComp.clipPath)
    if (!source) return
    const existing = this.managedByEntity.get(entity.id)
    if (existing && existing.clipPath === audioComp.clipPath) {
      existing.baseVolume = clamp01(audioComp.volume)
      existing.group = audioComp.group
      existing.loop = audioComp.loop
      existing.element.loop = audioComp.loop
      existing.element.volume = this.computeVolume(existing.group, existing.baseVolume)
      if (!this.paused && existing.element.paused) {
        await existing.element.play().catch(() => undefined)
      }
      audioComp.playing = true
      return
    }

    this.stopEntityAudio(entity.id)
    const element = new Audio(source)
    element.preload = 'auto'
    element.loop = audioComp.loop
    const managed: ManagedAudio = {
      entityId: entity.id,
      clipPath: audioComp.clipPath,
      group: audioComp.group,
      baseVolume: clamp01(audioComp.volume),
      loop: audioComp.loop,
      element
    }
    element.volume = this.computeVolume(managed.group, managed.baseVolume)
    this.managedByEntity.set(entity.id, managed)
    if (!this.paused) {
      await element.play().catch(() => undefined)
    }
    audioComp.playing = true
  }

  stopEntityAudio(entityId: string) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed) return
    managed.element.pause()
    managed.element.currentTime = 0
    this.managedByEntity.delete(entityId)
  }

  async syncScene(scene: Scene) {
    const existingIds = new Set(scene.entities.map((entity) => entity.id))
    for (const entityId of Array.from(this.managedByEntity.keys())) {
      if (!existingIds.has(entityId)) this.stopEntityAudio(entityId)
    }

    for (const entity of scene.entities) {
      const audioComp = entity.getComponent<AudioComponent>('Audio')
      if (!audioComp || !audioComp.enabled || !audioComp.clipPath) {
        this.stopEntityAudio(entity.id)
        continue
      }
      if (audioComp.playOnStart && !audioComp.playing) {
        audioComp.playing = true
      }
      if (audioComp.playing) {
        await this.playEntityAudio(entity)
      } else {
        this.stopEntityAudio(entity.id)
      }
    }
  }

  stopAll() {
    for (const entityId of Array.from(this.managedByEntity.keys())) {
      this.stopEntityAudio(entityId)
    }
    for (const oneShot of this.oneShotAudios) {
      oneShot.pause()
      oneShot.currentTime = 0
    }
    this.oneShotAudios.clear()
  }

  private async resolveAudioSource(clipPath: string) {
    if (!clipPath) return null
    if (clipPath.startsWith('data:') || clipPath.startsWith('http://') || clipPath.startsWith('https://')) {
      return clipPath
    }
    if (!window.unu?.readAssetDataUrl || !this.projectRoot || this.projectRoot === 'sample-project') {
      return null
    }
    if (!this.dataUrlCache.has(clipPath)) {
      this.dataUrlCache.set(clipPath, (async () => {
        const result = await window.unu?.readAssetDataUrl?.({
          projectRoot: this.projectRoot,
          relativePath: clipPath
        })
        return result?.dataUrl || null
      })())
    }
    return this.dataUrlCache.get(clipPath) ?? null
  }

  private refreshVolumes() {
    for (const managed of this.managedByEntity.values()) {
      managed.element.volume = this.computeVolume(managed.group, managed.baseVolume)
    }
  }

  private computeVolume(group: AudioGroup, baseVolume: number) {
    return clamp01(this.masterVolume * (this.groupVolumes[group] ?? 1) * clamp01(baseVolume))
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0, Math.min(1, value))
}
