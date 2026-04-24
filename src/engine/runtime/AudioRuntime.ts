import type { AudioGroup } from '../components/AudioComponent'
import { AudioComponent } from '../components/AudioComponent'
import type { Entity } from '../core/Entity'
import type { Scene } from '../core/Scene'
import * as ts from 'typescript'

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

type AudioRuntimeHooks = {
  initialMasterVolume?: number
  initialGroupVolumes?: Partial<Record<AudioGroup, number>>
  resolveOneShot?: (request: {
    clipPath: string
    options: PlayOneShotOptions
    projectRoot: string
    paused: boolean
    masterVolume: number
    groupVolumes: Record<AudioGroup, number>
  }) => {
    clipPath?: string
    options?: PlayOneShotOptions
    cancel?: boolean
  } | null | undefined
  resolveEntityAudio?: (request: {
    entity: Entity
    clipPath: string
    group: AudioGroup
    volume: number
    loop: boolean
    projectRoot: string
    paused: boolean
    masterVolume: number
    groupVolumes: Record<AudioGroup, number>
  }) => {
    clipPath?: string
    group?: AudioGroup
    volume?: number
    loop?: boolean
    cancel?: boolean
  } | null | undefined
}

export class AudioRuntime {
  private readonly managedByEntity = new Map<string, ManagedAudio>()
  private readonly oneShotAudios = new Set<HTMLAudioElement>()
  private readonly dataUrlCache = new Map<string, Promise<string | null>>()
  private masterVolume = 1
  private groupVolumes: Record<AudioGroup, number> = { bgm: 0.8, sfx: 1, ui: 1 }
  private projectRoot = ''
  private paused = false
  private projectHooks: AudioRuntimeHooks = {}

  setProjectRoot(projectRoot: string) {
    this.projectRoot = projectRoot
    this.dataUrlCache.clear()
  }

  setProjectRuntimeSource(sourceCode: string | null, scriptPath = 'assets/scripts/AudioRuntime.ts') {
    this.projectHooks = parseProjectAudioRuntime(sourceCode, scriptPath)
    if (Number.isFinite(this.projectHooks.initialMasterVolume)) {
      this.masterVolume = clamp01(Number(this.projectHooks.initialMasterVolume))
    }
    if (this.projectHooks.initialGroupVolumes && typeof this.projectHooks.initialGroupVolumes === 'object') {
      const groups: AudioGroup[] = ['bgm', 'sfx', 'ui']
      for (const group of groups) {
        const value = this.projectHooks.initialGroupVolumes[group]
        if (Number.isFinite(value)) this.groupVolumes[group] = clamp01(Number(value))
      }
    }
    this.refreshVolumes()
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
    const resolvedRequest = this.resolveOneShotRequest(clipPath, options)
    if (!resolvedRequest) return null
    const source = await this.resolveAudioSource(resolvedRequest.clipPath)
    if (!source) return null
    const group: AudioGroup = resolvedRequest.options.group ?? 'sfx'
    const baseVolume = clamp01(resolvedRequest.options.volume ?? 1)
    const audio = new Audio(source)
    audio.preload = 'auto'
    audio.loop = Boolean(resolvedRequest.options.loop)
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
    const resolvedRequest = this.resolveEntityAudioRequest(entity, audioComp.clipPath, audioComp.group, audioComp.volume, audioComp.loop)
    if (!resolvedRequest) {
      this.stopEntityAudio(entity.id)
      audioComp.playing = false
      return
    }
    const source = await this.resolveAudioSource(resolvedRequest.clipPath)
    if (!source) return
    const existing = this.managedByEntity.get(entity.id)
    if (existing && existing.clipPath === resolvedRequest.clipPath) {
      existing.baseVolume = clamp01(resolvedRequest.volume)
      existing.group = resolvedRequest.group
      existing.loop = resolvedRequest.loop
      existing.element.loop = resolvedRequest.loop
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
      clipPath: resolvedRequest.clipPath,
      group: resolvedRequest.group,
      baseVolume: clamp01(resolvedRequest.volume),
      loop: resolvedRequest.loop,
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

  private resolveOneShotRequest(clipPath: string, options: PlayOneShotOptions) {
    let nextClipPath = String(clipPath || '').trim()
    let nextOptions: PlayOneShotOptions = {
      group: options.group ?? 'sfx',
      volume: options.volume ?? 1,
      loop: options.loop ?? false
    }
    if (typeof this.projectHooks.resolveOneShot === 'function') {
      try {
        const patch = this.projectHooks.resolveOneShot({
          clipPath: nextClipPath,
          options: { ...nextOptions },
          projectRoot: this.projectRoot,
          paused: this.paused,
          masterVolume: this.masterVolume,
          groupVolumes: { ...this.groupVolumes }
        })
        if (patch?.cancel) return null
        if (patch?.clipPath != null) nextClipPath = String(patch.clipPath || '').trim()
        if (patch?.options && typeof patch.options === 'object') {
          nextOptions = { ...nextOptions, ...patch.options }
        }
      } catch (error) {
        console.warn('[UNU][audio] resolveOneShot override failed:', error)
      }
    }
    if (!nextClipPath) return null
    return { clipPath: nextClipPath, options: nextOptions }
  }

  private resolveEntityAudioRequest(entity: Entity, clipPath: string, group: AudioGroup, volume: number, loop: boolean) {
    let nextClipPath = String(clipPath || '').trim()
    let nextGroup: AudioGroup = group
    let nextVolume = volume
    let nextLoop = loop
    if (typeof this.projectHooks.resolveEntityAudio === 'function') {
      try {
        const patch = this.projectHooks.resolveEntityAudio({
          entity,
          clipPath: nextClipPath,
          group: nextGroup,
          volume: nextVolume,
          loop: nextLoop,
          projectRoot: this.projectRoot,
          paused: this.paused,
          masterVolume: this.masterVolume,
          groupVolumes: { ...this.groupVolumes }
        })
        if (patch?.cancel) return null
        if (patch?.clipPath != null) nextClipPath = String(patch.clipPath || '').trim()
        if (patch?.group === 'bgm' || patch?.group === 'sfx' || patch?.group === 'ui') nextGroup = patch.group
        if (Number.isFinite(patch?.volume)) nextVolume = Number(patch?.volume)
        if (typeof patch?.loop === 'boolean') nextLoop = patch.loop
      } catch (error) {
        console.warn('[UNU][audio] resolveEntityAudio override failed:', error)
      }
    }
    if (!nextClipPath) return null
    return {
      clipPath: nextClipPath,
      group: nextGroup,
      volume: nextVolume,
      loop: nextLoop
    }
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

function parseProjectAudioRuntime(sourceCode: string | null, scriptPath: string) {
  const raw = String(sourceCode || '').trim()
  if (!raw) return {} as AudioRuntimeHooks
  try {
    const transpiled = ts.transpileModule(raw, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve
      },
      fileName: scriptPath || 'AudioRuntime.ts'
    })
    const exportsBag: Record<string, unknown> = {}
    const moduleBag: { exports: Record<string, unknown> } = { exports: exportsBag }
    const evaluator = new Function('module', 'exports', transpiled.outputText)
    evaluator(moduleBag, exportsBag)
    const loaded = ((moduleBag.exports && (moduleBag.exports.default as unknown)) || moduleBag.exports) as Record<string, unknown> | null
    if (!loaded || typeof loaded !== 'object') return {} as AudioRuntimeHooks
    return loaded as AudioRuntimeHooks
  } catch (error) {
    console.warn('[UNU][audio] failed to parse project AudioRuntime.ts:', error)
    return {} as AudioRuntimeHooks
  }
}
