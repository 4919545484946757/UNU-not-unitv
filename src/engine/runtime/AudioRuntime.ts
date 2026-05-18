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
  muted: boolean
  playbackRate: number
  fadeOut: number
  element: HTMLAudioElement
}

type PlayOneShotOptions = {
  group?: AudioGroup
  volume?: number
  loop?: boolean
  muted?: boolean
  playbackRate?: number
  fadeIn?: number
  fadeOut?: number
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
    muted: boolean
    playbackRate: number
    fadeIn: number
    fadeOut: number
    projectRoot: string
    paused: boolean
    masterVolume: number
    groupVolumes: Record<AudioGroup, number>
  }) => {
    clipPath?: string
    group?: AudioGroup
    volume?: number
    loop?: boolean
    muted?: boolean
    playbackRate?: number
    fadeIn?: number
    fadeOut?: number
    cancel?: boolean
  } | null | undefined
}

export class AudioRuntime {
  private readonly managedByEntity = new Map<string, ManagedAudio>()
  private readonly oneShotAudios = new Set<HTMLAudioElement>()
  private readonly oneShotMeta = new Map<HTMLAudioElement, { group: AudioGroup; baseVolume: number; muted: boolean; fadeOut: number }>()
  private readonly fadeTimers = new Map<HTMLAudioElement, number>()
  private readonly dataUrlCache = new Map<string, Promise<string | null>>()
  private masterVolume = 1
  private groupVolumes: Record<AudioGroup, number> = { bgm: 0.8, sfx: 1, ui: 1 }
  private groupMutes: Record<AudioGroup, boolean> = { bgm: false, sfx: false, ui: false }
  private masterMuted = false
  private projectRoot = ''
  private projectMode: 'sample' | 'local' | 'memory' = 'memory'
  private paused = false
  private projectHooks: AudioRuntimeHooks = {}

  setProjectRoot(projectRoot: string, projectMode: 'sample' | 'local' | 'memory' = 'local') {
    this.projectRoot = projectRoot
    this.projectMode = projectMode
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

  setMasterMuted(muted: boolean) {
    this.masterMuted = !!muted
    this.refreshVolumes()
  }

  getMasterMuted() {
    return this.masterMuted
  }

  setGroupVolume(group: AudioGroup, volume: number) {
    this.groupVolumes[group] = clamp01(volume)
    this.refreshVolumes()
  }

  getGroupVolume(group: AudioGroup) {
    return this.groupVolumes[group] ?? 1
  }

  setGroupMuted(group: AudioGroup, muted: boolean) {
    this.groupMutes[group] = !!muted
    this.refreshVolumes()
  }

  getGroupMuted(group: AudioGroup) {
    return !!this.groupMutes[group]
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
    audio.playbackRate = clampPlaybackRate(resolvedRequest.options.playbackRate ?? 1)
    audio.muted = Boolean(resolvedRequest.options.muted) || this.masterMuted || this.getGroupMuted(group)
    audio.volume = this.computeVolume(group, baseVolume)
    this.oneShotAudios.add(audio)
    this.oneShotMeta.set(audio, {
      group,
      baseVolume,
      muted: Boolean(resolvedRequest.options.muted),
      fadeOut: Math.max(0, Number(resolvedRequest.options.fadeOut || 0))
    })
    audio.addEventListener('ended', () => {
      this.clearFade(audio)
      this.oneShotAudios.delete(audio)
      this.oneShotMeta.delete(audio)
    }, { once: true })
    audio.addEventListener('error', () => {
      this.clearFade(audio)
      this.oneShotAudios.delete(audio)
      this.oneShotMeta.delete(audio)
    }, { once: true })
    if (!this.paused) {
      this.fadeIn(audio, audio.volume, resolvedRequest.options.fadeIn ?? 0)
      await audio.play().catch(() => undefined)
    }
    return audio
  }

  async playEntityAudio(entity: Entity) {
    const audioComp = entity.getComponent<AudioComponent>('Audio')
    if (!audioComp || !audioComp.enabled) return
    const resolvedRequest = this.resolveEntityAudioRequest(entity, audioComp)
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
      existing.muted = resolvedRequest.muted
      existing.playbackRate = resolvedRequest.playbackRate
      existing.fadeOut = resolvedRequest.fadeOut
      existing.element.loop = resolvedRequest.loop
      existing.element.playbackRate = resolvedRequest.playbackRate
      existing.element.muted = existing.muted || this.masterMuted || this.getGroupMuted(existing.group)
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
    element.loop = resolvedRequest.loop
    element.playbackRate = resolvedRequest.playbackRate
    const managed: ManagedAudio = {
      entityId: entity.id,
      clipPath: resolvedRequest.clipPath,
      group: resolvedRequest.group,
      baseVolume: clamp01(resolvedRequest.volume),
      loop: resolvedRequest.loop,
      muted: resolvedRequest.muted,
      playbackRate: resolvedRequest.playbackRate,
      fadeOut: resolvedRequest.fadeOut,
      element
    }
    element.muted = managed.muted || this.masterMuted || this.getGroupMuted(managed.group)
    element.volume = this.computeVolume(managed.group, managed.baseVolume)
    this.managedByEntity.set(entity.id, managed)
    if (!this.paused) {
      this.fadeIn(element, element.volume, resolvedRequest.fadeIn)
      await element.play().catch(() => undefined)
    }
    audioComp.playing = true
  }

  stopEntityAudio(entityId: string) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed) return
    this.managedByEntity.delete(entityId)
    this.stopElement(managed.element, managed.fadeOut)
  }

  pauseEntityAudio(entityId: string) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed) return
    managed.element.pause()
  }

  resumeEntityAudio(entityId: string) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed || this.paused) return
    void managed.element.play().catch(() => undefined)
  }

  seekEntityAudio(entityId: string, seconds: number) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed || !Number.isFinite(seconds)) return
    managed.element.currentTime = Math.max(0, seconds)
  }

  getEntityAudioState(entityId: string) {
    const managed = this.managedByEntity.get(entityId)
    if (!managed) return null
    return {
      entityId: managed.entityId,
      clipPath: managed.clipPath,
      group: managed.group,
      playing: !managed.element.paused,
      currentTime: managed.element.currentTime,
      duration: Number.isFinite(managed.element.duration) ? managed.element.duration : 0,
      volume: managed.element.volume,
      muted: managed.element.muted,
      playbackRate: managed.element.playbackRate,
      loop: managed.element.loop
    }
  }

  stopGroup(group: AudioGroup, fadeOut = 0) {
    for (const managed of Array.from(this.managedByEntity.values())) {
      if (managed.group === group) {
        this.managedByEntity.delete(managed.entityId)
        this.stopElement(managed.element, fadeOut || managed.fadeOut)
      }
    }
    for (const audio of Array.from(this.oneShotAudios)) {
      const meta = this.oneShotMeta.get(audio)
      if (meta?.group !== group) continue
      this.stopElement(audio, fadeOut || meta.fadeOut)
      this.oneShotAudios.delete(audio)
      this.oneShotMeta.delete(audio)
    }
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
      this.stopElement(oneShot, this.oneShotMeta.get(oneShot)?.fadeOut ?? 0)
    }
    this.oneShotAudios.clear()
    this.oneShotMeta.clear()
  }

  private async resolveAudioSource(clipPath: string) {
    if (!clipPath) return null
    if (clipPath.startsWith('data:') || clipPath.startsWith('http://') || clipPath.startsWith('https://')) {
      return clipPath
    }
    if (!window.unu?.readAssetDataUrl || !this.projectRoot || this.projectMode === 'memory') {
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
      loop: options.loop ?? false,
      muted: options.muted ?? false,
      playbackRate: clampPlaybackRate(options.playbackRate ?? 1),
      fadeIn: Math.max(0, Number(options.fadeIn || 0)),
      fadeOut: Math.max(0, Number(options.fadeOut || 0))
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
    nextOptions = {
      ...nextOptions,
      group: nextOptions.group === 'bgm' || nextOptions.group === 'ui' ? nextOptions.group : 'sfx',
      volume: clamp01(Number(nextOptions.volume ?? 1)),
      loop: Boolean(nextOptions.loop),
      muted: Boolean(nextOptions.muted),
      playbackRate: clampPlaybackRate(Number(nextOptions.playbackRate ?? 1)),
      fadeIn: Math.max(0, Number(nextOptions.fadeIn || 0)),
      fadeOut: Math.max(0, Number(nextOptions.fadeOut || 0))
    }
    return { clipPath: nextClipPath, options: nextOptions }
  }

  private resolveEntityAudioRequest(entity: Entity, audioComp: AudioComponent) {
    let nextClipPath = String(audioComp.clipPath || '').trim()
    let nextGroup: AudioGroup = audioComp.group
    let nextVolume = audioComp.volume
    let nextLoop = audioComp.loop
    let nextMuted = audioComp.muted
    let nextPlaybackRate = clampPlaybackRate(audioComp.playbackRate)
    let nextFadeIn = Math.max(0, Number(audioComp.fadeIn || 0))
    let nextFadeOut = Math.max(0, Number(audioComp.fadeOut || 0))
    if (typeof this.projectHooks.resolveEntityAudio === 'function') {
      try {
        const patch = this.projectHooks.resolveEntityAudio({
          entity,
          clipPath: nextClipPath,
          group: nextGroup,
          volume: nextVolume,
          loop: nextLoop,
          muted: nextMuted,
          playbackRate: nextPlaybackRate,
          fadeIn: nextFadeIn,
          fadeOut: nextFadeOut,
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
        if (typeof patch?.muted === 'boolean') nextMuted = patch.muted
        if (Number.isFinite(patch?.playbackRate)) nextPlaybackRate = clampPlaybackRate(Number(patch?.playbackRate))
        if (Number.isFinite(patch?.fadeIn)) nextFadeIn = Math.max(0, Number(patch?.fadeIn))
        if (Number.isFinite(patch?.fadeOut)) nextFadeOut = Math.max(0, Number(patch?.fadeOut))
      } catch (error) {
        console.warn('[UNU][audio] resolveEntityAudio override failed:', error)
      }
    }
    if (!nextClipPath) return null
    return {
      clipPath: nextClipPath,
      group: nextGroup,
      volume: nextVolume,
      loop: nextLoop,
      muted: nextMuted,
      playbackRate: nextPlaybackRate,
      fadeIn: nextFadeIn,
      fadeOut: nextFadeOut
    }
  }

  private refreshVolumes() {
    for (const managed of this.managedByEntity.values()) {
      managed.element.volume = this.computeVolume(managed.group, managed.baseVolume)
      managed.element.muted = managed.muted || this.masterMuted || this.getGroupMuted(managed.group)
    }
    for (const audio of this.oneShotAudios) {
      const meta = this.oneShotMeta.get(audio)
      if (!meta) continue
      audio.volume = this.computeVolume(meta.group, meta.baseVolume)
      audio.muted = meta.muted || this.masterMuted || this.getGroupMuted(meta.group)
    }
  }

  private computeVolume(group: AudioGroup, baseVolume: number) {
    return clamp01(this.masterVolume * (this.groupVolumes[group] ?? 1) * clamp01(baseVolume))
  }

  private fadeIn(element: HTMLAudioElement, targetVolume: number, seconds: number) {
    const duration = Math.max(0, Number(seconds || 0))
    this.clearFade(element)
    if (duration <= 0) {
      element.volume = targetVolume
      return
    }
    const startedAt = performance.now()
    element.volume = 0
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / (duration * 1000))
      element.volume = targetVolume * progress
      if (progress >= 1) this.clearFade(element)
    }, 33)
    this.fadeTimers.set(element, timer)
  }

  private stopElement(element: HTMLAudioElement, fadeOut: number) {
    const duration = Math.max(0, Number(fadeOut || 0))
    this.clearFade(element)
    if (duration <= 0 || element.paused) {
      element.pause()
      element.currentTime = 0
      return
    }
    const startedAt = performance.now()
    const startVolume = element.volume
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / (duration * 1000))
      element.volume = startVolume * (1 - progress)
      if (progress >= 1) {
        this.clearFade(element)
        element.pause()
        element.currentTime = 0
      }
    }, 33)
    this.fadeTimers.set(element, timer)
  }

  private clearFade(element: HTMLAudioElement) {
    const timer = this.fadeTimers.get(element)
    if (timer != null) window.clearInterval(timer)
    this.fadeTimers.delete(element)
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0, Math.min(1, value))
}

function clampPlaybackRate(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(0.25, Math.min(4, value))
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
