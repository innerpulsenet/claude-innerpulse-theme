export type SceneName = 'beat' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      // the local hour the session started, for the fog's tint
      hour: number
      scene: SceneName
      // the drift's step: each one redraws the plate scene a little moved
      phase: number
    }
  }
}
