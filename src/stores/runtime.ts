import { defineStore } from 'pinia'

export const useRuntimeStore = defineStore('runtime', {
  state: () => ({
    isPlaying: false,
    isPaused: false,
    fps: 60,
    deltaTime: 0
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
    stop() {
      this.isPlaying = false
      this.isPaused = false
    },
    setDeltaTime(delta: number) {
      this.deltaTime = delta
      this.fps = delta > 0 ? Math.round(1 / delta) : 0
    }
  }
})
