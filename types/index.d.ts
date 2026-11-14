export type SceneName = 'beat' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      // the local hour the session started, for the fog's tint
      hour: number
      scene: SceneName
    }
  }
}
