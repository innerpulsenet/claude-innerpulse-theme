import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { SceneName } from '../types'
import { plateScene, workingGlyph } from './plate'
import { makeColors } from './make-colors.js'
import { SCENE as DIAL } from './scene'

const P = 'innerpulse-theme'
const hourAtom = atom({ plugin: 'innerpulse-theme', key: 'hour' } as const, 12)
const sceneAtom = atom({ plugin: 'innerpulse-theme', key: 'scene' } as const, 'beat' as SceneName)
// The drift's step: each step is one redraw of the plate scene, which moves it a little
const phaseAtom = atom({ plugin: 'innerpulse-theme', key: 'phase' } as const, 0)

// The drift is off unless /innerpulse drift turned it on (kept across sessions): where the app
// freezes backdrop motion, each step only reads as a flicker
const DRIFT = 'drift'
// How often the drift redraws the backdrop
const DRIFT_MS = 18_000

const SOUND = 'sound'
// A turn this long earns the finish tick, when the sound is on
const LONG_TURN_MS = 60_000

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

// When each running tool call began, for the working glyph
const tools = new Map<string, number>()

const hourOf = (ms: number) => new Date(ms).getHours()

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
      description: 'innerpulse theme: beat, dial, still, drift, off, or sound on|off|test',
    })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    const now = await $.clock.now()
    await update($, hourAtom, () => hourOf(now))
    const set = await $.theme.set(look(await read($, sceneAtom)))
    if (!set.isDrawn) $.ui.status(`innerpulse: ${set.reason}`)
    // The drift: a step every 18 s; writing the phase redraws the backdrop alone
    $.clock.every(DRIFT_MS, async () => {
      if ((await $.store.get(DRIFT)) !== true) return
      await update($, phaseAtom, prev => prev + 1)
    })
    return next(e)
  })

  // Note when each call began, for the working glyph
  on('tool.call', async ($, e, next) => {
    tools.set(e.tool_use_id, await $.clock.now())
    try {
      return await next(e)
    } finally {
      tools.delete(e.tool_use_id)
    }
  })

  // The finish tick, when the sound is on and the turn ran a minute or more
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if ('agentId' in e && typeof e.agentId === 'string') return result
    tools.clear()
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
    if (arg === 'still' || arg === 'drift') {
      await $.store.set(DRIFT, arg === 'drift')
      await update($, phaseAtom, prev => prev + 1)
      return {
        text:
          arg === 'still'
            ? 'innerpulse: the background holds still. /innerpulse drift to set it moving again.'
            : 'innerpulse: the background drifts, a small step every 18 seconds. /innerpulse still to stop it.',
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
    if (e.props.scene === 'innerpulse-dial') return <Svg source={DIAL} alt="A faint graduated dial behind fog" isInteractive />
    if (e.props.scene !== 'innerpulse-beat') return next(e)
    const phase = await read($, phaseAtom)
    const isStill = (await $.store.get(DRIFT)) !== true
    return (
      <Svg
        source={plateScene(await read($, hourAtom), isStill ? undefined : phase)}
        alt="The innerpulse plate machined into the ground, its beat echoing away as a faint wave"
        isInteractive
      />
    )
  })

  // A running tool call shows the working glyph beside its row, at once: the desktop holds an
  // animation still after about two seconds, so a delayed fade-in would never show
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
