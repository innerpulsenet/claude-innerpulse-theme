// What the plate is doing and since when; `flag` a slot to cool from red after a turn
// that had a failed tool call or a cache miss
export type Live = { mode: 'idle' | 'work' | 'done'; since: number; flag: number | null }

export type SceneName = 'beat' | 'dial'

declare module 'claude-code' {
  interface PluginState {
    'innerpulse-theme': {
      live: Live
      // prompt tokens of this session's recent main turns, oldest first: the backdrop's reading
      turns: number[]
      // the local hour the fog was last tinted for
      hour: number
      scene: SceneName
    }
  }
}
