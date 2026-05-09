import { defineStore } from 'pinia'

let loadingDelayTimer: ReturnType<typeof window.setTimeout> | null = null

export const useRuntimeStore = defineStore('runtime', {
  state: () => ({
    isPlaying: false,
    isPaused: false,
    playDebugEnabled: false,
    detailedPerformanceEnabled: false,
    isLoading: false,
    loadingMessage: '',
    fps: 60,
    deltaTime: 0,
    frameTimeMs: 0,
    renderTimeMs: 0,
    scriptTimeMs: 0,
    collisionTimeMs: 0,
    animationTimeMs: 0,
    audioTimeMs: 0,
    cameraTimeMs: 0,
    entityCount: 0
  }),
  actions: {
    play() {
      this.isPlaying = true
      this.isPaused = false
    },
    pause() {
      if (!this.isPlaying) return
      this.isPaused = true
    },
    resume() {
      if (!this.isPlaying) {
        this.play()
        return
      }
      this.isPaused = false
    },
    togglePause() {
      if (!this.isPlaying) {
        this.play()
        return
      }
      this.isPaused = !this.isPaused
    },
    togglePlay() {
      this.isPlaying = !this.isPlaying
      this.isPaused = false
    },
    setPlayDebugEnabled(enabled: boolean) {
      this.playDebugEnabled = !!enabled
    },
    togglePlayDebug() {
      this.playDebugEnabled = !this.playDebugEnabled
    },
    setDetailedPerformanceEnabled(enabled: boolean) {
      this.detailedPerformanceEnabled = !!enabled
      if (!this.detailedPerformanceEnabled) this.resetDetailedPerformanceMetrics()
    },
    toggleDetailedPerformance() {
      this.setDetailedPerformanceEnabled(!this.detailedPerformanceEnabled)
    },
    resetDetailedPerformanceMetrics() {
      this.frameTimeMs = 0
      this.renderTimeMs = 0
      this.scriptTimeMs = 0
      this.collisionTimeMs = 0
      this.animationTimeMs = 0
      this.audioTimeMs = 0
      this.cameraTimeMs = 0
    },
    startLoading(message = 'Loading...', delayMs = 220) {
      this.loadingMessage = message
      if (loadingDelayTimer) {
        window.clearTimeout(loadingDelayTimer)
        loadingDelayTimer = null
      }
      if (delayMs <= 0) {
        this.isLoading = true
        return
      }
      this.isLoading = false
      loadingDelayTimer = window.setTimeout(() => {
        this.isLoading = true
        loadingDelayTimer = null
      }, delayMs)
    },
    stopLoading() {
      if (loadingDelayTimer) {
        window.clearTimeout(loadingDelayTimer)
        loadingDelayTimer = null
      }
      this.isLoading = false
      this.loadingMessage = ''
    },
    stop() {
      this.isPlaying = false
      this.isPaused = false
      this.stopLoading()
    },
    setDeltaTime(delta: number) {
      this.deltaTime = delta
      this.fps = delta > 0 ? Math.round(1 / delta) : 0
    },
    setPerformanceMetrics(metrics: Partial<{
      frameTimeMs: number
      renderTimeMs: number
      scriptTimeMs: number
      collisionTimeMs: number
      animationTimeMs: number
      audioTimeMs: number
      cameraTimeMs: number
      entityCount: number
    }>) {
      const smooth = (previous: number, next: number) => previous <= 0 ? next : previous * 0.82 + next * 0.18
      if (metrics.frameTimeMs !== undefined) this.frameTimeMs = smooth(this.frameTimeMs, metrics.frameTimeMs)
      if (metrics.renderTimeMs !== undefined) this.renderTimeMs = smooth(this.renderTimeMs, metrics.renderTimeMs)
      if (metrics.scriptTimeMs !== undefined) this.scriptTimeMs = smooth(this.scriptTimeMs, metrics.scriptTimeMs)
      if (metrics.collisionTimeMs !== undefined) this.collisionTimeMs = smooth(this.collisionTimeMs, metrics.collisionTimeMs)
      if (metrics.animationTimeMs !== undefined) this.animationTimeMs = smooth(this.animationTimeMs, metrics.animationTimeMs)
      if (metrics.audioTimeMs !== undefined) this.audioTimeMs = smooth(this.audioTimeMs, metrics.audioTimeMs)
      if (metrics.cameraTimeMs !== undefined) this.cameraTimeMs = smooth(this.cameraTimeMs, metrics.cameraTimeMs)
      if (metrics.entityCount !== undefined) this.entityCount = metrics.entityCount
    }
  }
})
