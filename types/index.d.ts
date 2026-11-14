export type SceneName = 'rain' | 'columns' | 'mark' | 'plate' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      scene: SceneName
    }
  }
}
