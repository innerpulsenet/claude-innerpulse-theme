import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene'
import { BEAT } from './scene-beat'

// Two scenes: the plate enlarged with the beat's light passing through it (default), and the dial.
const SCENES = {
  beat: { svg: BEAT, alt: 'The innerpulse plate, enlarged, with light passing through its slots' },
  dial: { svg: SCENE, alt: 'A faint graduated dial turning slowly' },
} as const
type SceneName = keyof typeof SCENES
let current: SceneName = 'beat'

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
  backdrop: { scene: `innerpulse-${scene}`, glass: { blur: 14, opacity: 0.72 } },
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'innerpulse',
      description: 'innerpulse theme: beat (the plate), dial, or off',
    })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    const set = await $.theme.set(look(current))
    if (!set.isDrawn) $.ui.status(`innerpulse: ${set.reason}`)

    return next(e)
  })

  on('command.run', { command: 'innerpulse' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'off') {
      await $.theme.clear()

      return { text: 'innerpulse theme off. Run /innerpulse to bring it back.' }
    }
    if (arg === 'beat' || arg === 'dial') current = arg
    const set = await $.theme.set(look(current))

    return {
      text: set.isDrawn
        ? `innerpulse theme on, scene: ${current}.`
        : `innerpulse theme set, but nothing draws it here: ${set.reason}`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.plugin !== 'innerpulse-theme') return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const name = e.props.scene.replace(/^innerpulse-/, '')
    if (name !== 'beat' && name !== 'dial') return next(e)
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENES[name].svg} alt={SCENES[name].alt} isInteractive />
  })
}
