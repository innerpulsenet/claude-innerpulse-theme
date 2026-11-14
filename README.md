# innerpulse-theme

A Claude Code mod that dresses the app in the innerpulse look: carbon ink by night and paper by day, an ember accent, and a backdrop scene behind frosted carbon glass.

**The rain** (the default scene): the mark's six bars, scaled up to fill the window, made of glyphs. A dim, still field of hex digits and signs fills each bar, and brighter trails fall through it at their own speeds. Under it, the columns' soft glow keeps the mark's shape readable as its color drifts, and every edge fades softly into the ground. Behind the whole window, a much fainter glyph field drifts down over three minutes and a broad pool of the same shifting light wanders across.

**The columns** (`/innerpulse columns`): the six bars of the innerpulse mark scaled up to fill the window as tall, soft-edged columns of light. Each glows and fades on its own slow rhythm, so the mark keeps re-forming, and the light's color drifts over a minute from inky blue through plum to a dim ember and back.

**The mark** (`/innerpulse mark`): the six bars of the innerpulse beat, large and faint at the right of the window, with a soft warm light passing through them one after another every 4.8 seconds.

The app frosts its panels over the scene with a tint of the scene's own near-black, so the prompt box sits on the ground rather than as a gray block. That tint matters: untinted glass stopped the scene's motion in the app.

**The plate** (`/innerpulse plate`): the plate machined into the ground at the top right, its beat echoing out to the left as a faint wave, with light rippling through it every 12 seconds.

**Running tool calls** show the working glyph beside their row: the six bars at text height, with light passing through them where the app keeps it moving (desktop and the editor).

**Sound** (off by default): `/innerpulse sound on` plays a soft, synthesized tick when a turn that ran a minute or more finishes. On Linux it plays through PipeWire or PulseAudio; on macOS through the engine's player.

**The dial** (`/innerpulse dial`): a faint graduated dial turning slowly behind drifting fog.

Everything holds still under reduced motion. The scenes are drawn for a dark window, so the theme asks the app for one.

**Commands**

- `/innerpulse rain`, `/innerpulse columns`, `/innerpulse mark`, `/innerpulse plate` or `/innerpulse dial` picks the scene; the choice lasts the session.
- `/innerpulse glass off` leaves the app's panels unfrosted over the scene; `/innerpulse glass on` frosts them again. Remembered across sessions.
- `/innerpulse palette off` keeps the backdrop but leaves the app's own colors; `/innerpulse palette on` brings the innerpulse palette back. Remembered across sessions.
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
