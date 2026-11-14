import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const T0 = Date.parse('2026-11-14T15:00:00Z')

const BACKDROP = {
  plugin: 'innerpulse-theme',
  component: 'Backdrop',
  surface: 'desktop',
  props: { scene: 'innerpulse-rain', plugin: 'innerpulse-theme', glass: { blur: 14, tint: '#0b0d10', opacity: 0.5 } },
} as const

// The engine beneath the mod: the ops it calls, and the ends of the chains it hooks
const engine = (on: On) => {
  const ran: string[][] = []
  const sets: { colors?: unknown }[] = []
  on('command.register', () => ({ value: { command: 'innerpulse' } }))
  on('theme.set', (_, e) => (sets.push(e as never), { value: { isDrawn: true, requestId: 'r1' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', (_, e) => (ran.push([...e.argv]), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => e as never)
  on('tool.call', (_, e) => ((e as { command?: string }).command === 'false' ? { result: 'boom', isError: true } : { result: 'ok' }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer, usage: e.usage }))
  on('turn.step', async function* (_, e) {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn',
      messageCount: e.messageCount,
      usage: { model: e.model, input_tokens: 500, output_tokens: 900, cache_read_input_tokens: 30_000, cache_creation_input_tokens: 2_000 },
    } as never
  })
  return { ran, sets }
}

const scene = async ($: Engine) => {
  const ui = await $.ui.mount(BACKDROP as never)
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  return { alt: String(svg?.props.alt), source: String(svg?.props.source) }
}

test('the rain loops on its own under tinted glass, turns leave it alone, and the palette and glass can be left off', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on, {})
  const w = engine(on)
  const sets = w.sets
  await $.session.start({ cwd: '/tmp/x', surface: 'desktop', isInteractive: true })

  const rest = await scene($)
  expect(rest.alt).toContain('trails falling')
  // Well under the 131,072-character limit on a scene
  expect(rest.source.length).toBeLessThan(100_000)
  // One drawing whose motion loops by itself, still under reduced motion
  expect(rest.source).toContain('infinite')
  expect(rest.source).toContain('prefers-reduced-motion')
  expect(sets.at(-1)?.colors).toBeDefined()
  // The glass is always tinted: untinted glass stopped the motion in the app
  expect(JSON.stringify(sets.at(-1))).toContain('"tint":"#0b0d10"')

  await $.prompt.submit({ text: 'go' } as never)
  await $.tool.call({ tool: 'Bash', command: 'false' } as never)
  const s = $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 3 })
  for await (const _ of s);
  await $.turn.complete({ answer: 'a', durationMs: 90_000, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect((await scene($)).source).toBe(rest.source)

  const off = await $.command.run({ command: 'innerpulse', args: 'palette off' } as never)
  expect(String(off.text)).toContain('palette off')
  expect(sets.at(-1)?.colors).toBeUndefined()
  await $.command.run({ command: 'innerpulse', args: 'glass off' } as never)
  expect(JSON.stringify(sets.at(-1))).toContain('"glass":false')

  // Sound is off until asked for; on, a long turn ends with the tick
  expect(w.ran).toEqual([])
  await $.command.run({ command: 'innerpulse', args: 'sound on' } as never)
  await clock.advance(10)
  expect(w.ran[0]?.[0]).toBe('pw-play')
})

test('a running tool call shows the working glyph on desktop, not in the terminal', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on, {})
  engine(on)
  await $.session.start({ cwd: '/tmp/x', surface: 'desktop', isInteractive: true })
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({
      plugin: 'innerpulse-theme',
      component: 'ToolUse',
      surface,
      props: { tool_use_id: 'tu1', tool: 'Bash', input: {}, isRunning: true, isErrored: false, isInterrupted: false },
    } as never)
    const glyph = await ui.find({ type: 'Svg' })
    if (surface === 'desktop') expect(String(glyph?.props.source)).toContain('class="bar"')
    else expect(glyph).toBeUndefined()
    await ui.unmount()
  }
})
