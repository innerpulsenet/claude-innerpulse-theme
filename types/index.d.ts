export type SceneName = 'mark' | 'plate' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      scene: SceneName
    }
  }
}
