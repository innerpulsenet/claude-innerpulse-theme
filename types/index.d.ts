// What the plate is doing: the mode and when it began
export type Live = { mode: 'idle' | 'think' | 'busy' | 'glow'; since: number }

// One slot lit red once, for a failed tool call or a cache miss
export type FlashState = { slot: number; at: number } | null

export type SceneName = 'beat' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      live: Live
      flash: FlashState
      // prompt tokens of this session's recent main turns, oldest first: the backdrop's reading
      turns: number[]
      // the local hour the fog was last tinted for
      hour: number
      scene: SceneName
    }
  }
}
