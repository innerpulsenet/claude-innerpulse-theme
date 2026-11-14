// The live beat scene, drawn at runtime from what the session is doing. Everything follows the
// brand's working indicator (references/working.md in the kit), slowed to an ambient pace:
//   idle   the plate at rest, its slots dark
//   think  the retake: light rises through the slots in turn, the strike hottest (4.8 s, 7.2 s after 20 s)
//   busy   a tool runs: light passes through the standing plate, left to right (2.4 s)
//   glow   the turn ended: the slots' light cools away over five seconds, the afterglow
// and a flash: one slot lit red once, for a failed tool call or a cache miss.
// Behind the plate, the brand's "reading": this session's own turn sizes as a faint mirrored band.
// The plate only ever moves as light; under reduced motion it holds still.
import { GEOMETRY as G } from './geometry'

export type Mode = 'idle' | 'think' | 'busy' | 'glow'
export type Flash = { slot: number; ageMs: number }

export type SceneInput = {
  mode: Mode
  // how long the current mode has run, so a redraw picks the cycle up where it was
  elapsedMs: number
  // prompt tokens of this session's recent turns, oldest first
  turns: readonly number[]
  // the local hour, 0-23, for the fog's tint
  hour: number
  flash?: Flash
}

const W = 1600
const H = 1000
const f = (v: number) => (Math.round(v * 100) / 100).toString()
const s = (ms: number) => `${f(ms / 1000)}s`

// The fog's family tint by time of day: coral at dawn and dusk, ground-toned by day, cool at night
const FOG: Record<'dawn' | 'day' | 'dusk' | 'night', { dark: string; light: string; a: number }> = {
  dawn: { dark: '#ff7a59', light: '#a83a18', a: 0.1 },
  day: { dark: '#1f2329', light: '#e9e4db', a: 0.9 },
  dusk: { dark: '#ff9466', light: '#b4521f', a: 0.09 },
  night: { dark: '#1b2433', light: '#dcdfe6', a: 0.95 },
}
export const partOfDay = (hour: number): keyof typeof FOG =>
  hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night'

function lampCss(mode: Mode, elapsedMs: number, flash?: Flash): string {
  const T = G.think
  const rules: string[] = []
  if (mode === 'think') {
    const period = (elapsedMs > T.slowAfter * 1000 ? T.slowPeriod : T.period) * 2 * 1000
    rules.push(`@keyframes th{0%{opacity:0}9%{opacity:1}30%{opacity:.35}40%{opacity:0}100%{opacity:0}}`)
    G.slots.forEach((_, i) => {
      const start = (T.riseAt + i * T.riseLag) * period
      rules.push(`.l${i}{animation:th ${s(period)} linear infinite;animation-delay:${s(start - (elapsedMs % period))}}`)
    })
  } else if (mode === 'busy') {
    const period = T.busy * 2 * 1000
    const on = T.passWidth * 100
    rules.push(`@keyframes ps{0%{opacity:0}${f(on / 2)}%{opacity:1}${f(on)}%{opacity:0}100%{opacity:0}}`)
    G.slots.forEach((_, i) => {
      rules.push(`.l${i}{animation:ps ${s(period)} ease-in-out infinite;animation-delay:${s(i * T.passLag * period - (elapsedMs % period))}}`)
    })
  } else if (mode === 'glow') {
    rules.push(`@keyframes gl{0%{opacity:.8}100%{opacity:0}}`)
    rules.push(`.lamp{animation:gl 5s cubic-bezier(.2,.6,.3,1) forwards;animation-delay:${s(-elapsedMs)}}`)
  }
  if (flash) {
    rules.push(`@keyframes fl{0%{opacity:0}8%{opacity:.5}100%{opacity:0}}`)
    rules.push(`.flash{animation:fl 2.4s ease-out forwards;animation-delay:${s(-flash.ageMs)}}`)
  }
  // Reduced motion: no movement; a working plate keeps a faint steady light, a flash a steady red
  const still =
    `@media (prefers-reduced-motion:reduce){.lamp{animation:none;opacity:${mode === 'think' || mode === 'busy' ? '.4' : '0'}}` +
    `.flash{animation:none;opacity:${flash ? '.4' : '0'}}.spill{animation:none}}`
  return rules.join('') + still
}

// The reading: one mirrored bar per turn, newest on the right, faint, fading out toward the bottom
function reading(turns: readonly number[]): string {
  const recent = turns.slice(-48)
  if (recent.length === 0) return ''
  const max = Math.max(1, ...recent)
  // Kept to the left half, clear of the plate, newest nearest it
  const pitch = 13
  const bw = 8
  const mid = 800
  const amp = 100
  const x0 = 110 + (48 - recent.length) * pitch
  const bars = recent
    .map((v, i) => {
      const h = Math.max(6, (v / max) * amp)
      return `<rect x="${f(x0 + i * pitch)}" y="${f(mid - h)}" width="${bw}" height="${f(h * 2)}" rx="2"/>`
    })
    .join('')
  return `<g class="reading" mask="url(#rm)">${bars}</g>`
}

export function liveScene(o: SceneInput): string {
  const fog = FOG[partOfDay(o.hour)]
  const lamps = G.slots
    .map(
      (sl, i) =>
        `<g opacity="${f(0.42 * G.light[i]!)}"><rect class="lamp l${i}" x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${sl.rx}" fill="url(#lamp)"/></g>`,
    )
    .join('')
  const flashSlot = o.flash ? G.slots[o.flash.slot % G.slots.length]! : undefined
  const flash = flashSlot
    ? `<rect class="flash" x="${flashSlot.x}" y="${flashSlot.y}" width="${flashSlot.w}" height="${flashSlot.h}" rx="${flashSlot.rx}" fill="url(#red)" opacity="0"/>`
    : ''
  const walls = G.slots
    .map(
      sl =>
        `<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${sl.rx}" class="floor"/>` +
        `<rect x="${f(sl.x + 1.2)}" y="${f(sl.y + sl.h - 3.2)}" width="${f(sl.w - 2.4)}" height="1.4" rx=".7" class="wall"/>`,
    )
    .join('')
  // The plate's spill of light: breathing with the work, cooling with the afterglow
  const spillCss =
    o.mode === 'think' || o.mode === 'busy'
      ? `.spill{opacity:.5;animation:sp ${o.mode === 'busy' ? '2.4s' : '4.8s'} ease-in-out infinite alternate}@keyframes sp{from{opacity:.25}to{opacity:.6}}`
      : o.mode === 'glow'
        ? `.spill{animation:gl 5s ease-out forwards;animation-delay:${s(-o.elapsedMs)}}`
        : `.spill{opacity:0}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.ground{fill:#0b0d10}.fogc{stop-color:${fog.dark}}.p0{stop-color:#14161a}.p1{stop-color:#0e1013}
.edge{stroke:#e3e6e9;stroke-opacity:.06}.floor{fill:#08090b}.wall{fill:#e3e6e9;opacity:.035}
.hot{stop-color:${G.brand.hot}}.emb{stop-color:${G.brand.pulse}}.spillc{stop-color:${G.brand.pulse}}.vig{opacity:1}
.reading{fill:#e3e6e9;opacity:.05}.red0{stop-color:#ff6a5c}.red1{stop-color:${G.brand.pulse}}
.lamp{opacity:0}
${lampCss(o.mode, o.elapsedMs, o.flash)}
${spillCss}
@media (prefers-color-scheme:light){
.ground{fill:${G.brand.paper}}.fogc{stop-color:${fog.light}}.p0{stop-color:#efebe4}.p1{stop-color:#e7e2d9}
.edge{stroke:#ffffff;stroke-opacity:.7}.floor{fill:#d8d1c5}.wall{fill:#fff;opacity:.5}
.hot{stop-color:${G.brand.pulse}}.emb{stop-color:${G.brand.pulseDeep}}.vig{opacity:0}
.reading{fill:#14171c;opacity:.06}.red0{stop-color:${G.brand.pulse}}.red1{stop-color:${G.brand.pulseDeep}}}
</style>
<defs>
<radialGradient id="fog"><stop class="fogc" offset="0" stop-opacity="${fog.a}"/><stop class="fogc" offset="1" stop-opacity="0"/></radialGradient>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop class="p0" offset="0"/><stop class="p1" offset="1"/></linearGradient>
<linearGradient id="edgeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="edgem"><rect x="-120" y="-120" width="240" height="240" fill="url(#edgeg)"/></mask>
<linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1"><stop class="emb" offset="0"/><stop class="hot" offset=".5" stop-opacity=".85"/><stop class="emb" offset="1"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop class="red1" offset="0"/><stop class="red0" offset=".5"/><stop class="red1" offset="1"/></linearGradient>
<radialGradient id="spillg"><stop class="spillc" offset="0" stop-opacity=".16"/><stop class="spillc" offset="1" stop-opacity="0"/></radialGradient>
<radialGradient id="vigg" cx=".5" cy=".62" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="rmx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
<linearGradient id="rmy" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="rmy-m"><rect width="${W}" height="${H}" fill="url(#rmy)"/></mask>
<mask id="rm"><g mask="url(#rmy-m)"><rect width="${W}" height="${H}" fill="url(#rmx)"/></g></mask>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .89  0 0 0 0 .9  0 0 0 0 .91  0 0 0 .9 0"/></filter>
</defs>
<rect class="ground" width="${W}" height="${H}"/>
<ellipse cx="420" cy="260" rx="640" ry="400" fill="url(#fog)"/>
${reading(o.turns)}
<svg width="100%" height="100%" viewBox="-128 -112 192 250" preserveAspectRatio="xMaxYMin meet" overflow="hidden">
<ellipse class="spill" cx="0" cy="0" rx="130" ry="105" fill="url(#spillg)"/>
<path d="${G.plateD}" fill="url(#plate)" fill-rule="evenodd"/>
<path d="${G.plateD}" fill="none" class="edge" stroke-width=".6" fill-rule="evenodd" mask="url(#edgem)"/>
${walls}
${lamps}
${flash}
</svg>
<rect class="vig" width="${W}" height="${H}" fill="url(#vigg)"/>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".05"/>
</svg>`
}

// The working glyph for a long tool call: the bare beat at text height, light passing through it.
// It fades in once the call has run eight seconds, so quick calls never show it.
export function workingGlyph(elapsedMs: number, size = 14): string {
  const T = G.think
  const period = T.busy * 1000
  const delay = Math.max(0, 8000 - elapsedMs)
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
svg{opacity:0;animation:in .3s ease-out forwards;animation-delay:${s(delay)}}@keyframes in{to{opacity:1}}
.bar{fill:${G.brand.pulse}}.lit{fill:${G.brand.hot}}
@keyframes ps{0%{opacity:0}13%{opacity:.9}26%{opacity:0}100%{opacity:0}}${lit}
@media (prefers-color-scheme:light){.bar{fill:${G.brand.pulseDeep}}.lit{fill:${G.brand.pulse}}}
@media (prefers-reduced-motion:reduce){.lit{animation:none}svg{animation:none;opacity:${delay > 0 ? 0 : 1}}}
</style>${bars}</svg>`
}
