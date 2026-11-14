// The plate scene: one still drawing, made once per session. The desktop app holds a backdrop's
// animation still after about two seconds and fades between redraws, so the scene never changes
// while the session runs.
//
// The innerpulse plate is machined into the ground at the top right, unlit; its six-bar beat
// echoes out to the left as a long, faint mirrored wave that fades to nothing before the text
// column. Ground tones only: the brand keeps ember out of the atmosphere (references/atmosphere.md).
import { GEOMETRY as G } from './geometry'

const W = 1600
const H = 1000
const f = (v: number) => (Math.round(v * 100) / 100).toString()
const s = (ms: number) => `${f(ms / 1000)}s`

// The fog's family tint by the hour the session started: coral at dawn and dusk, ground-toned
// by day, cool at night
const FOG: Record<'dawn' | 'day' | 'dusk' | 'night', { dark: string; light: string; a: number }> = {
  dawn: { dark: '#ff7a59', light: '#a83a18', a: 0.08 },
  day: { dark: '#1f2329', light: '#e9e4db', a: 0.9 },
  dusk: { dark: '#ff9466', light: '#b4521f', a: 0.07 },
  night: { dark: '#1b2433', light: '#dcdfe6', a: 0.95 },
}
export const partOfDay = (hour: number): keyof typeof FOG =>
  hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night'

// The echo: the mark's six heights repeated leftward from the plate, each beat smaller, with a
// slow swell so it reads as a wave rather than a stamp. In the plate's own units (it spans -100..100).
function echo(): string {
  const heights = G.bars.map(b => b.h / 2)
  const pitch = 15
  const bw = 7
  const count = 80
  const out: string[] = []
  for (let k = 0; k < count; k++) {
    const x = -116 - k * pitch
    const decay = Math.exp(-k / 70)
    const swell = 0.72 + 0.28 * Math.cos(k / 9.5)
    const h = Math.max(3, heights[(heights.length - 1 - (k % heights.length))]! * decay * swell * 0.9)
    out.push(`<rect x="${f(x - bw)}" y="${f(-h)}" width="${bw}" height="${f(h * 2)}" rx="2"/>`)
  }
  return out.join('')
}

export function plateScene(hour: number): string {
  const fog = FOG[partOfDay(hour)]
  const slots = G.slots
    .map(
      sl =>
        `<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${sl.rx}" class="floor"/>` +
        `<rect x="${f(sl.x + 1.2)}" y="${f(sl.y + sl.h - 3.2)}" width="${f(sl.w - 2.4)}" height="1.4" rx=".7" class="wall"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.ground{fill:${G.brand.ink}}.fogc{stop-color:${fog.dark}}.fogg{stop-color:#171a1f}.p0{stop-color:#15171b}.p1{stop-color:#0d0f12}
.edge{stroke:#e3e6e9;stroke-opacity:.07}.floor{fill:#07080a}.wall{fill:#e3e6e9;opacity:.04}
.echo{fill:#e3e6e9;opacity:.04}.vig{opacity:1}.grain{opacity:.05}
@media (prefers-color-scheme:light){
.ground{fill:${G.brand.paper}}.fogc{stop-color:${fog.light}}.fogg{stop-color:#ebe6dd}.p0{stop-color:#efebe4}.p1{stop-color:#e6e0d6}
.edge{stroke:#fff;stroke-opacity:.75}.floor{fill:#d6cfc3}.wall{fill:#fff;opacity:.55}
.echo{fill:#14171c;opacity:.05}.vig{opacity:0}.grain{opacity:.03}}
</style>
<defs>
<radialGradient id="fog"><stop class="fogc" offset="0" stop-opacity="${fog.a}"/><stop class="fogc" offset="1" stop-opacity="0"/></radialGradient>
<radialGradient id="fog2"><stop class="fogg" offset="0" stop-opacity=".9"/><stop class="fogg" offset="1" stop-opacity="0"/></radialGradient>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop class="p0" offset="0"/><stop class="p1" offset="1"/></linearGradient>
<linearGradient id="edgeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="edgem"><rect x="-120" y="-120" width="240" height="240" fill="url(#edgeg)"/></mask>
<linearGradient id="ex" x1="-1250" y1="0" x2="-110" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#fff"/></linearGradient>
<mask id="em"><rect x="-2400" y="-200" width="2300" height="400" fill="url(#ex)"/></mask>
<radialGradient id="vigg" cx=".5" cy=".62" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .89  0 0 0 0 .9  0 0 0 0 .91  0 0 0 .9 0"/></filter>
</defs>
<rect class="ground" width="${W}" height="${H}"/>
<ellipse cx="380" cy="230" rx="640" ry="400" fill="url(#fog)"/>
<ellipse cx="1180" cy="780" rx="720" ry="420" fill="url(#fog2)"/>
<svg width="100%" height="100%" viewBox="-470 -170 540 540" preserveAspectRatio="xMaxYMin meet" overflow="visible">
<g class="echo" mask="url(#em)">${echo()}</g>
<path d="${G.plateD}" fill="url(#plate)" fill-rule="evenodd"/>
<path d="${G.plateD}" fill="none" class="edge" stroke-width=".6" fill-rule="evenodd" mask="url(#edgem)"/>
${slots}
</svg>
<rect class="vig" width="${W}" height="${H}" fill="url(#vigg)"/>
<rect class="grain" width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`
}

// The working glyph for a running tool call: the bare beat at text height, light passing through it.
export function workingGlyph(elapsedMs: number, size = 14): string {
  const T = G.think
  const period = T.busy * 1000
  const bars = G.bars
    .map(
      (b, i) =>
        `<rect class="bar" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.rx}"/>` +
        `<rect class="lit b${i}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.rx}" opacity="0"/>`,
    )
    .join('')
  const lit = G.bars
    .map((_, i) => `.b${i}{animation:ps ${s(period)} ease-in-out infinite;animation-delay:${s(i * T.passLag * period - (elapsedMs % period))}}`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-110 -110 220 220">
<style>
.bar{fill:${G.brand.pulse}}.lit{fill:${G.brand.hot}}
@keyframes ps{0%{opacity:0}13%{opacity:.9}26%{opacity:0}100%{opacity:0}}${lit}
@media (prefers-color-scheme:light){.bar{fill:${G.brand.pulseDeep}}.lit{fill:${G.brand.pulse}}}
@media (prefers-reduced-motion:reduce){.lit{animation:none}}
</style>${bars}</svg>`
}
