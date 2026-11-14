# innerpulse-theme

A Claude Code mod that dresses the app in the innerpulse look: carbon ink by night and paper by day, an ember accent, and a backdrop scene behind frosted carbon glass.

**The plate** (the default scene). Your innerpulse plate is machined into the ground at the top right, bleeding off the edge, its slots unlit. Its six-bar beat echoes out to the left as a long, faint mirrored wave that fades to nothing before the conversation. Ground tones only, no ember. The fog's tint follows the hour the session started: coral at dawn and dusk, ground-toned by day, cool at night.

**Drift** (off by default, `/innerpulse drift` to try it): every 18 seconds the scene takes one small step: the echo's swell travels outward, the fog wanders, and a soft light passes through one of the plate's slots, each in a different slot. The desktop app runs a background's animation for only about two seconds after each draw, so the motion comes from these slow redraws, each starting where the last ended. Where the app freezes a background's motion (it does when it draws without GPU acceleration), each step only reads as a flicker, so the drift stays off until asked for; `/innerpulse still` turns it off again. The choice is remembered across sessions.

**Running tool calls** show the working glyph beside their row: the six bars at text height, with light passing through them where the app keeps it moving (desktop and the editor).

**Sound** (off by default): `/innerpulse sound on` plays a soft, synthesized tick when a turn that ran a minute or more finishes. On Linux it plays through PipeWire or PulseAudio; on macOS through the engine's player.

**The dial** is still there as a second scene: a faint graduated dial behind fog.

The glyph holds still under reduced motion, and everything switches to paper colors in light mode.

**Commands**

- `/innerpulse beat` or `/innerpulse dial` picks the scene; the choice lasts the session.
- `/innerpulse still` or `/innerpulse drift` stops or starts the plate's drift.
- `/innerpulse sound on`, `/innerpulse sound off`, `/innerpulse sound test`.
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
