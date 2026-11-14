import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const T0 = Date.parse('2026-11-14T15:00:00Z')

const BACKDROP = {
  plugin: 'innerpulse-theme',
  component: 'Backdrop',
  surface: 'desktop',
  props: { scene: 'innerpulse-beat', plugin: 'innerpulse-theme', glass: { blur: 14, opacity: 0.66 } },
} as const

// The engine beneath the mod: the ops it calls, and the ends of the chains it hooks
const engine = (on: On) => {
  const ran: string[][] = []
  on('command.register', () => ({ value: { command: 'innerpulse' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'r1' } }))
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
  return { ran }
}

const scene = async ($: Engine) => {
  const ui = await $.ui.mount(BACKDROP as never)
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  return { alt: String(svg?.props.alt), source: String(svg?.props.source) }
}

test('the plate lights for the turn, holds through its tool calls, and cools after it', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on, {})
  const w = engine(on)
  await $.session.start({ cwd: '/tmp/x', surface: 'desktop', isInteractive: true })

  expect((await scene($)).alt).toContain('at rest')

  await $.prompt.submit({ text: 'go' } as never)
  const working = await scene($)
  expect(working.alt).toContain('while Claude works')
  expect(working.source).toContain('@keyframes th')
  expect(working.source).toContain('.lamp{opacity:.6}')

  // Tool calls inside the turn change nothing: the drawing is not redrawn mid-turn
  await $.tool.call({ tool: 'Bash', command: 'false' } as never)
  await $.tool.call({ tool: 'Bash', command: 'true' } as never)
  expect((await scene($)).source).toBe(working.source)
  expect((await scene($)).alt).toContain('while Claude works')

  const s = $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 3 })
  for await (const _ of s);
  await $.turn.complete({ answer: 'a', durationMs: 90_000, isAborted: false, turnId: 't', reason: 'answer' } as never)
  const cooling = await scene($)
  expect(cooling.alt).toContain('cooling')
  // The failed call cools one slot from red, and the finished turn joins the reading
  expect(cooling.source).toContain('class="flag"')
  expect(cooling.source).toContain('class="reading"')

  // Past the afterglow the plate draws at rest, with no animation left to replay
  await clock.advance(5_500)
  const rested = await scene($)
  expect(rested.alt).toContain('at rest')
  // The troubled turn's ember stays; nothing is left to animate
  expect(rested.source).toContain('class="flag"')
  expect(rested.source).not.toContain('@keyframes')

  // Status reports the draws: rest, then working, then the afterglow, then rest
  const status = await $.command.run({ command: 'innerpulse', args: 'status' } as never)
  expect(String(status.text)).toMatch(/Backdrop draws, oldest first: idle .*work .*done .*idle/)

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
