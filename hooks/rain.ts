// The rain scene (the default): the mark's six bars, scaled up to fill the window, made of
// glyphs. A dim, still field of hex digits and signs fills each bar; brighter trails fall through
// it at their own speeds, their heads warm, their tails fading. Under it the columns scene's soft
// glow keeps the mark's shape readable, its color drifting from inky blue through plum to a dim
// ember over a minute.
//
// Built from what the theme-examples scenes use: CSS animation, patterns, gradients and masks,
// no filter. Each glyph field is one pattern, so the drawing stays small.
import { GEOMETRY as G } from './geometry'

const W = 1600
const H = 1000
const f = (v: number) => (Math.round(v * 100) / 100).toString()

// The mark spread a little past both edges, as in the columns scene
const SX = 1700 / 206
const SY = 1120 / 186.44
// The glyph grid, in CSS px
const CW = 20
const CH = 22
const COLS = 29
const ROWS = 40
const GLYPHS = '0123456789ABCDEF:+=<>|*'
const HUES = ['#2d4170', '#4b3166', '#6a2e2a', '#2d4170']

// A fixed sequence, so every draw is the same drawing
function random(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function glyphTile(id: string, fill: string, seed: number): string {
  const r = random(seed)
  const cells: string[] = []
  for (let c = 0; c < COLS; c++) {
    for (let row = 0; row < ROWS; row++) {
      if (r() < 0.18) continue // gaps, so the field reads as signal, not a wall
      const ch = GLYPHS[Math.floor(r() * GLYPHS.length)]!
      cells.push(`<text x="${c * CW + CW / 2}" y="${row * CH + CH - 6}">${ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch}</text>`)
    }
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${COLS * CW}" height="${ROWS * CH}"><g fill="${fill}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="15" text-anchor="middle">${cells.join('')}</g></pattern>`
}

export function rainScene(): string {
  const r = random(7)
  const bars = G.bars.map(b => ({
    x: W / 2 + b.x * SX,
    y: H / 2 + b.y * SY,
    w: b.w * SX,
    h: b.h * SY,
  }))
  // Falling trails: a few per bar, on the glyph grid, each with its own length, speed and phase
  const trails: string[] = []
  const rules: string[] = []
  let n = 0
  bars.forEach(b => {
    const first = Math.ceil(b.x / CW)
    const last = Math.floor((b.x + b.w) / CW) - 1
    const lanes: number[] = []
    for (let c = first; c <= last; c++) lanes.push(c)
    const count = Math.max(2, Math.round(lanes.length * 0.5))
    for (let k = 0; k < count && lanes.length > 0; k++) {
      const lane = lanes.splice(Math.floor(r() * lanes.length), 1)[0]!
      const len = 160 + r() * 260
      const dur = 5 + r() * 7
      const delay = -r() * dur
      trails.push(`<rect class="t${n}" x="${lane * CW}" y="${f(b.y - len)}" width="${CW}" height="${f(len)}" fill="url(#trail)"/>`)
      rules.push(`.t${n}{animation:fall ${f(dur)}s linear ${f(delay)}s infinite;--d:${f(b.h + len)}px}`)
      n++
    }
  })
  const breathe = [11, 13, 9.5, 12, 10.5, 14]
    .map((s, i) => `.c${i}{animation:br ${s}s ease-in-out ${f(-i * 2.3)}s infinite alternate}`)
    .join('')
  const hue = HUES.map((c, i) => `${f((i / (HUES.length - 1)) * 100)}%{stop-color:${c}}`).join('')
  const glow = bars
    .map((b, i) => `<rect class="c${i}" x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" fill="url(#soft)"/>`)
    .join('')
  const shape = bars.map(b => `<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.hue{animation:hue 60s linear infinite}
@keyframes hue{${hue}}
@keyframes br{from{opacity:.3}to{opacity:1}}
${breathe}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(var(--d))}}
${rules.join('')}
@media (prefers-reduced-motion: reduce){.hue,[class^="c"],[class^="t"]{animation:none}.trails{display:none}}
</style>
<defs>
<linearGradient id="soft" x1="0" y1="0" x2="1" y2="0">
<stop class="hue" offset="0" stop-color="${HUES[0]}" stop-opacity="0"/>
<stop class="hue" offset=".5" stop-color="${HUES[0]}" stop-opacity=".9"/>
<stop class="hue" offset="1" stop-color="${HUES[0]}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="trail" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff"/>
</linearGradient>
<linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#000"/><stop offset=".2" stop-color="#fff"/><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
</linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeY)"/></mask>
<clipPath id="mark">${shape}</clipPath>
<mask id="drops" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><g class="trails">${trails.join('')}</g></mask>
${glyphTile('dim', '#8f949b', 3)}
${glyphTile('lit', '#ffd9c2', 3)}
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0b0d10"/>
<g mask="url(#fade)">
<g opacity=".4">${glow}</g>
<g clip-path="url(#mark)">
<rect width="${W}" height="${H}" fill="url(#dim)" opacity=".1"/>
<rect width="${W}" height="${H}" fill="url(#lit)" opacity=".5" mask="url(#drops)"/>
</g>
</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`
}
