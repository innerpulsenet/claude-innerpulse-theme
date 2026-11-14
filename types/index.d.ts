export type SceneName = 'beat' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      scene: SceneName
    }
  }
}
