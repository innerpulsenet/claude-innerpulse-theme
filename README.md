# innerpulse-theme

A Claude Code mod that dresses the app in the innerpulse look: carbon ink by night and paper by day, an ember accent, and a backdrop scene behind frosted carbon glass.

**The live plate** (the default scene). Your innerpulse plate, enlarged and machined into the ground at the right edge, lit by what Claude is doing, quietly so it stays ambient:

- **At rest** between turns, its slots dark.
- **Working:** when you send, light strikes through the slots in turn and settles to a steady glow that holds until the turn ends.
- **Done:** the glow cools away.
- **A turn that had a failed tool call or a cache miss** leaves one slot with a faint red ember until the next turn.

The desktop app runs a background's animation for about two seconds after each redraw and then holds it still. So the plate moves only in short transitions as a turn starts and ends, and each state ends on a still frame.

Behind it, faint on the left, is the brand's reading: this session's own turns as a mirrored band, one bar per turn sized by its prompt, newest nearest the plate. The fog's tint follows the time of day: coral at dawn and dusk, ground-toned by day, cool at night.

**Long tool calls** get the working glyph beside their row once they have run eight seconds: the six bars at text height with light passing through them (desktop and the editor).

**Sound** (off by default): `/innerpulse sound on` plays a soft, synthesized tick when a turn that ran a minute or more finishes. On Linux it plays through PipeWire or PulseAudio; on macOS through the engine's player.

**The dial** is still there as a second scene: a faint graduated dial behind fog (its slow turning needs a surface that keeps animating the background).

Everything holds still under reduced motion, and switches to paper colors in light mode.

**Commands**

- `/innerpulse beat` or `/innerpulse dial` picks the scene; the choice lasts the session.
- `/innerpulse sound on`, `/innerpulse sound off`, `/innerpulse sound test`.
- `/innerpulse status` says what the plate is doing and what the backdrop last drew.
- `/innerpulse probe` puts a test card in place of the background for 20 seconds, showing whether the app draws it and runs its animation.
- `/innerpulse off` turns the theme off; `/innerpulse` turns it back on.

**Rebuilding the generated files**: `node scripts/build-geometry.mjs <path to the innerpulse-brand kit's scripts/pulse.mjs>` writes `hooks/geometry.ts`; `node scripts/build-sound.mjs` writes `sounds/done.wav`.

## Install

At the prompt of a terminal session:

```
/plugin install innerpulse-theme --marketplace innerpulsenet/claude-innerpulse-theme
```

From a shell:

```bash
claude plugin install innerpulse-theme --marketplace innerpulsenet/claude-innerpulse-theme
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `innerpulsenet/claude-innerpulse-theme`, then Add plugin.

Installed at the user scope, the theme loads in every new session.
