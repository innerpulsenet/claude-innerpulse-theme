import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { SceneName } from '../types'
import { plateScene, workingGlyph } from './plate'
import { makeColors } from './make-colors.js'
import { GEOMETRY } from './geometry'
import { columnsScene } from './columns'
import { markScene } from './mark'
import { SCENE as DIAL } from './scene'

const P = 'innerpulse-theme'
const sceneAtom = atom({ plugin: 'innerpulse-theme', key: 'scene' } as const, 'columns' as SceneName)
// Read once at session start, so the backdrop hook reads nothing while it draws, as the
// theme-examples hooks do
let hour = 12
// Whether the theme brings its palette as well as the backdrop; off leaves the app's own colors
const PALETTE = 'palette'
// Whether the app frosts its panels over the scene; off leaves them as they are
const GLASS = 'glass'
// The panels' frost, tinted to the scene's own near-black so the prompt box sits on the ground
// rather than as a gray block. Untinted glass at 0.66 stopped the scene's motion in this app;
// the theme-examples scenes all tint theirs, at 0.55 or less.
const FROST = { blur: 14, tint: '#0b0d10', opacity: 0.5 }

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

// The scenes are drawn for a dark window, so the look asks for one
const look = (scene: SceneName, withPalette: boolean, withGlass: boolean): ThemeSetArgs => ({
  ...(withPalette && { colors: theme }),
  backdrop: { scene: `innerpulse-${scene}`, glass: withGlass ? FROST : false },
  overrideColorScheme: 'dark',
})

// Sets the look, with the palette and the glass unless /innerpulse turned either off
async function apply($: EngineInterface) {
  return $.theme.set(
    look(await read($, sceneAtom), (await $.store.get(PALETTE)) !== false, (await $.store.get(GLASS)) !== false),
  )
}

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
      description: 'innerpulse theme: columns, mark, plate, dial, glass on|off, palette on|off, off, or sound on|off|test',
    })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    hour = hourOf(await $.clock.now())
    const set = await apply($)
    if (!set.isDrawn) $.ui.status(`innerpulse: ${set.reason}`)
    return next(e)
  })

  // The finish tick, when the sound is on and the turn ran a minute or more
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if ('agentId' in e && typeof e.agentId === 'string') return result
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
    if (arg === 'palette' && (value === 'on' || value === 'off')) await $.store.set(PALETTE, value === 'on')
    if (arg === 'glass' && (value === 'on' || value === 'off')) await $.store.set(GLASS, value === 'on')
    if (arg === 'columns' || arg === 'mark' || arg === 'plate' || arg === 'dial') await update($, sceneAtom, () => arg)
    const scene = await read($, sceneAtom)
    const set = await apply($)
    const palette = (await $.store.get(PALETTE)) !== false ? 'on' : 'off'
    const glass = (await $.store.get(GLASS)) !== false ? 'on' : 'off'
    return {
      text: set.isDrawn
        ? `innerpulse theme on: scene ${scene}, palette ${palette}, glass ${glass}.`
        : `innerpulse theme set, but nothing draws it here: ${set.reason}`,
    }
  })

  // Synchronous and reading nothing while it draws, like the theme-examples backdrop hook
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== P || e.surface !== 'desktop') return next(e)
    const { Svg } = $.ui.resolve(e)
    if (e.props.scene === 'innerpulse-dial') return <Svg isInteractive alt="A faint graduated dial turning slowly behind drifting fog" source={DIAL} />
    if (e.props.scene === 'innerpulse-columns') {
      return <Svg isInteractive alt="The six bars of the innerpulse mark as tall columns of slowly shifting light" source={columnsScene()} />
    }
    if (e.props.scene === 'innerpulse-mark') {
      return <Svg isInteractive alt="The six bars of the innerpulse mark, light passing through them" source={markScene(GEOMETRY.bars)} />
    }
    if (e.props.scene !== 'innerpulse-plate') return next(e)
    return (
      <Svg
        isInteractive
        alt="The innerpulse plate machined into the ground, light rippling through it and along its echo"
        source={plateScene(hour)}
      />
    )
  })

  // A running tool call shows the working glyph beside its row
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    if (!e.props.isRunning || (e.surface !== 'desktop' && e.surface !== 'vscode')) return row
    const { Box, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" alignItems="center" columnGap={1}>
        {row}
        <Svg source={workingGlyph()} alt="Still running" width={14} height={14} isInteractive />
      </Box>
    )
  })
}
