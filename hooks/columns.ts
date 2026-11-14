// The columns scene (the default): the mark's six bars scaled up to fill the window as tall,
// soft-edged columns of light. Each glows and fades on its own slow rhythm, so the mark keeps
// re-forming, and the light's color drifts over a minute from inky blue through plum to a dim
// ember and back. Only what the theme-examples scenes use: CSS animation of opacity and color,
// gradients and one mask, no filter. Drawn for a dark window.
import { GEOMETRY as G } from './geometry'

const W = 1600
const H = 1000
const f = (v: number) => (Math.round(v * 100) / 100).toString()

// The mark spans x -103..103 and y -93..93; spread it a little past both edges, and its tallest
// bar a little past the top and bottom
const SX = 1700 / 206
const SY = 1120 / 186.44
// Each column's own breathing period, in seconds: unequal, so the mark re-forms differently
const BREATH = [11, 13, 9.5, 12, 10.5, 14]
// The colors the light drifts through, one full cycle a minute
const HUES = ['#2d4170', '#4b3166', '#6a2e2a', '#2d4170']

export function columnsScene(): string {
  const breathe = BREATH.map(
    (s, i) => `.c${i}{animation:br ${s}s ease-in-out ${f(-i * 2.3)}s infinite alternate}`,
  ).join('')
  const hue = HUES.map((c, i) => `${f((i / (HUES.length - 1)) * 100)}%{stop-color:${c}}`).join('')
  const columns = G.bars
    .map((b, i) => {
      const x = W / 2 + b.x * SX
      const y = H / 2 + b.y * SY
      // Brighter for the mark's taller bars, as its own light weights are
      const weight = f(0.55 + 0.45 * G.light[i]!)
      return `<g opacity="${weight}"><rect class="col c${i}" x="${f(x)}" y="${f(y)}" width="${f(b.w * SX)}" height="${f(b.h * SY)}" fill="url(#soft)"/></g>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.hue{animation:hue 60s linear infinite}
@keyframes hue{${hue}}
@keyframes br{from{opacity:.3}to{opacity:1}}
${breathe}
@media (prefers-reduced-motion: reduce){.hue,.col{animation:none}.col{opacity:.65}}
</style>
<defs>
<linearGradient id="soft" x1="0" y1="0" x2="1" y2="0">
<stop class="hue" offset="0" stop-color="${HUES[0]}" stop-opacity="0"/>
<stop class="hue" offset=".5" stop-color="${HUES[0]}" stop-opacity=".9"/>
<stop class="hue" offset="1" stop-color="${HUES[0]}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#000"/><stop offset=".22" stop-color="#fff"/><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
</linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeY)"/></mask>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0b0d10"/>
<g mask="url(#fade)" opacity=".55">${columns}</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`
}
