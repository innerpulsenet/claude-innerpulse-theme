# innerpulse-theme

A Claude Code mod that dresses the app in the innerpulse look: carbon ink by night and paper by day, an ember accent, and a backdrop scene behind frosted carbon glass.

**Scenes**

- **beat** (the default): the innerpulse plate, enlarged and machined into the ground at the right edge, with ember light passing through its six slots every 9 seconds.
- **dial**: a faint graduated dial turning slowly behind drifting fog.

Both hold still under reduced motion, and switch to paper colors in light mode.

**Commands**

- `/innerpulse beat` or `/innerpulse dial` picks the scene.
- `/innerpulse off` turns the theme off; `/innerpulse` turns it back on.

Each session starts on the beat scene.

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
