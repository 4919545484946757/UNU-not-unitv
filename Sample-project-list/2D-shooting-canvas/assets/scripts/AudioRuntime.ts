export default {
  initialMasterVolume: 1,
  initialGroupVolumes: {
    bgm: 0.8,
    sfx: 1,
    ui: 1
  },
  resolveOneShot(request) {
    return {
      options: {
        ...request.options,
        playbackRate: request.options.playbackRate ?? 1,
        fadeIn: request.options.fadeIn ?? 0,
        fadeOut: request.options.fadeOut ?? 0
      }
    }
  },
  resolveEntityAudio(request) {
    return {
      volume: request.volume,
      playbackRate: request.playbackRate,
      fadeIn: request.fadeIn,
      fadeOut: request.fadeOut
    }
  }
}
