import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Live, SceneName } from '../types'
import { AFTERGLOW_MS, liveScene, workingGlyph } from './live'
import { makeColors } from './make-colors.js'
import { SCENE as DIAL } from './scene'

const P = 'innerpulse-theme'
const liveAtom = atom({ plugin: 'innerpulse-theme', key: 'live' } as const, { mode: 'idle', since: 0, flag: null } as Live)
const turnsAtom = atom({ plugin: 'innerpulse-theme', key: 'turns' } as const, [])
const hourAtom = atom({ plugin: 'innerpulse-theme', key: 'hour' } as const, 12)
const sceneAtom = atom({ plugin: 'innerpulse-theme', key: 'scene' } as const, 'beat' as SceneName)

const SOUND = 'sound'
// A turn this long earns the finish tick, when the sound is on
const LONG_TURN_MS = 60_000
// A request this big that the cache served less than half of re-sent its prefix
const MISS_MIN_TOKENS = 20_000

// The brand's two grounds: carbon ink by night, paper by day. Surfaces, text tiers and
// status colors are the kit's own (references/themes.md, section 3); ember is the accent.
const { theme, problems } = makeColors({
  label: 'innerpulse',
  light: {
    roles: { accent: '#d12c1e', danger: '#a3221a', success: '#0d6d3d', warning: '#8b5109', pro: '#6a3fd0' },
    gray: {
      anchors: {
        'surface-0': '#f4f1ec',
        'surface-1': '#f7f5f1',
        'surface-2': '#faf8f5',
        'surface-3': '#faf8f5',
        'text-primary': '#14171c',
        'text-secondary': '#454b56',
        'text-muted': '#575e6b',
      },
    },
  },
  dark: {
    roles: { accent: '#f43a2a', danger: '#ff9a8f', success: '#7dffb0', warning: '#ffb347', pro: '#b38cff' },
    gray: {
      anchors: {
        'surface-0': '#0b0d10',
        'surface-1': '#111317',
        'surface-2': '#171a1f',
        'surface-3': '#1f2329',
        'text-primary': '#e3e6e9',
        'text-secondary': '#b9bdc3',
        'text-muted': '#8f949b',
      },
    },
  },
})

// Panels keep their own (now themed) color, frosted over the scene.
const look = (scene: SceneName): ThemeSetArgs => ({
  colors: theme,
  backdrop: { scene: `innerpulse-${scene}`, glass: { blur: 14, opacity: 0.66 } },
})

// The session's work, as this module sees it: tool calls running and when each began, the
// running turn's prompt tokens, when the main thread's last response arrived, and whether the
// turn has had a failed call or a cache miss. None of it redraws the scene: the desktop reloads
// the drawing on each redraw, so the plate changes only when a turn starts and when it ends
const tools = new Map<string, number>()
const turn = { tokens: 0, lastStepAt: null as number | null, flags: 0, isFlagged: false }

const hourOf = (ms: number) => new Date(ms).getHours()

async function setMode($: EngineInterface, mode: Live['mode'], flag: number | null = null) {
  const now = await $.clock.now()
  await update($, liveAtom, (prev): Live => (prev.mode === mode && mode === 'work' ? prev : { mode, since: now, flag }))
}

// The finish tick: on Linux through PipeWire or PulseAudio, else the engine's own player (macOS)
async function tick($: EngineInterface) {
  const path = `${$.plugin.root}/sounds/done.wav`
  for (const argv of [['pw-play', '--volume', '0.6', path], ['paplay', path]]) {
    try {
      if ((await $.process.run(argv, { timeoutMs: 5_000 })).exitCode === 0) return
    } catch {
      // not installed here; try the next
    }
  }
  await $.audio.play({ asset: 'sounds/done.wav' }, { gain: 0.6 }).catch(() => undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'innerpulse',
      description: 'innerpulse theme: beat, dial, off, or sound on|off',
    })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    const now = await $.clock.now()
    await update($, hourAtom, () => hourOf(now))
    const set = await $.theme.set(look(await read($, sceneAtom)))
    if (!set.isDrawn) $.ui.status(`innerpulse: ${set.reason}`)
    // The fog follows the time of day: look at the hour every ten minutes, redraw when it turns
    $.clock.every(10 * 60_000, async () => {
      const h = hourOf(await $.clock.now())
      if (h !== (await read($, hourAtom))) await update($, hourAtom, () => h)
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    turn.tokens = 0
    turn.isFlagged = false
    await setMode($, 'work')
    return next(e)
  })

  // Note when each call began, for the working glyph, and whether one failed
  on('tool.call', async ($, e, next) => {
    tools.set(e.tool_use_id, await $.clock.now())
    try {
      const result = await next(e)
      if ('isError' in result && result.isError === true) turn.isFlagged = true
      return result
    } finally {
      tools.delete(e.tool_use_id)
    }
  })

  // Count the turn's prompt and catch a cold cache on the main thread
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const usage = result.usage
    if (!usage || typeof e.agentId === 'string') return result
    const prompt = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
    turn.tokens += prompt
    const isMiss = turn.lastStepAt !== null && prompt >= MISS_MIN_TOKENS && usage.cache_read_input_tokens < prompt / 2
    turn.lastStepAt = await $.clock.now()
    if (isMiss) turn.isFlagged = true
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if ('agentId' in e && typeof e.agentId === 'string') return result
    tools.clear()
    if (turn.tokens > 0) {
      const size = turn.tokens
      await update($, turnsAtom, prev => [...prev, size].slice(-48))
    }
    // The afterglow; one slot cools from red when the turn had trouble, a different slot each time
    let flag: number | null = null
    if (turn.isFlagged) {
      turn.flags += 1
      flag = turn.flags % 6
    }
    await setMode($, 'done', flag)
    if (e.durationMs >= LONG_TURN_MS && (await $.store.get(SOUND)) === true) void tick($)
    return result
  })

  on('command.run', { command: 'innerpulse' }, async ($, e) => {
    const [arg = '', value = ''] = e.args.trim().split(/\s+/)
    if (arg === 'off') {
      await $.theme.clear()
      return { text: 'innerpulse theme off. Run /innerpulse to bring it back.' }
    }
    if (arg === 'sound') {
      if (value === 'on' || value === 'off') await $.store.set(SOUND, value === 'on')
      const isOn = (await $.store.get(SOUND)) === true
      if (value === 'test' || value === 'on') void tick($)
      return {
        text: isOn
          ? 'innerpulse sound on: a soft tick when a turn that ran a minute or more finishes. /innerpulse sound off to stop.'
          : 'innerpulse sound off. /innerpulse sound on to hear a soft tick when a long turn finishes.',
      }
    }
    if (arg === 'beat' || arg === 'dial') await update($, sceneAtom, () => arg)
    const scene = await read($, sceneAtom)
    const set = await $.theme.set(look(scene))
    return {
      text: set.isDrawn
        ? `innerpulse theme on, scene: ${scene}.`
        : `innerpulse theme set, but nothing draws it here: ${set.reason}`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== P) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    if (e.props.scene === 'innerpulse-dial') return <Svg source={DIAL} alt="A faint graduated dial turning slowly" isInteractive />
    if (e.props.scene !== 'innerpulse-beat') return next(e)

    const live = await read($, liveAtom)
    const turns = await read($, turnsAtom)
    const hour = await read($, hourAtom)
    const now = await $.clock.now()
    const source = liveScene({
      mode: live.mode,
      elapsedMs: Math.max(0, now - live.since),
      turns,
      hour,
      flag: live.flag,
    })
    const doing = { idle: 'at rest', work: 'lit in turn while Claude works', done: 'cooling after the turn' }
    const mode = live.mode === 'done' && now - live.since >= AFTERGLOW_MS ? 'idle' : live.mode
    return <Svg source={source} alt={`The innerpulse plate, ${doing[mode]}`} isInteractive />
  })

  // A tool call that runs long earns the working glyph beside its row
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    if (!e.props.isRunning || (e.surface !== 'desktop' && e.surface !== 'vscode')) return row
    const { Box, Svg } = $.ui.resolve(e)
    const started = tools.get(e.props.tool_use_id)
    const elapsed = started === undefined ? 0 : Math.max(0, (await $.clock.now()) - started)
    return (
      <Box flexDirection="row" alignItems="center" columnGap={1}>
        {row}
        <Svg source={workingGlyph(elapsed)} alt="Still running" width={14} height={14} isInteractive />
      </Box>
    )
  })
}
