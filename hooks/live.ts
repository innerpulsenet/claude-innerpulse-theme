// The live beat scene, drawn at runtime from what the session is doing. It follows the brand's
// working indicator (references/working.md in the kit), slowed to an ambient pace:
//   idle   the plate at rest, its slots dark
//   work   ignition: light strikes through the slots in turn and settles to a steady glow
//   done   cooling: the glow goes out; a slot keeps a faint red ember until the next turn when
//          the turn had a failed tool call or a cache miss
// The desktop runs a backdrop's animation for about two seconds after each draw and then holds
// it still, so each state is a short transition that ends on a still frame, never a loop.
// Behind the plate, the brand's "reading": this session's own turn sizes as a faint mirrored band.
// The plate only ever moves as light; under reduced motion it holds still.
import { GEOMETRY as G } from './geometry'

export type Mode = 'idle' | 'work' | 'done'
// The desktop runs a backdrop's animation for about two seconds after each draw, then holds it
// still, so each change of state is a short transition that ends on a still: past this, a redraw
// draws the still alone
export const MOTION_MS = 1_800
// The cooling's length; past it a done plate is at rest
export const AFTERGLOW_MS = MOTION_MS
// A working slot's steady glow, and a troubled turn's leftover ember
const LIT = '.6'
const EMBER = '.4'


export type SceneInput = {
  mode: Mode
  // how long the current mode has run, so a redraw picks the cycle up where it was
  elapsedMs: number
  // prompt tokens of this session's recent turns, oldest first
  turns: readonly number[]
  // the local hour, 0-23, for the fog's tint
  hour: number
  // a slot to cool from red in the afterglow: the turn had a failed tool call or a cache miss
  flag?: number | null
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

function lampCss(mode: Mode, elapsedMs: number, flag: number | null): string {
  const T = G.think
  // Motion only while the change is fresh: a later redraw of the same state draws its still
  const isFresh = elapsedMs < MOTION_MS
  const rules: string[] = [`.flag{opacity:${EMBER}}`]
  if (mode === 'work') {
    // Ignition: light strikes through the slots in turn, then settles to a steady glow
    rules.push(`.lamp{opacity:${LIT}}`)
    if (isFresh) {
      rules.push(`@keyframes th{0%{opacity:0}35%{opacity:1}100%{opacity:${LIT}}}`)
      G.slots.forEach((_, i) => {
        rules.push(`.l${i}{animation:th 1.1s ease-out both;animation-delay:${s(i * T.riseLag * 1000 * 1.6 - elapsedMs)}}`)
      })
    }
  } else if (mode === 'done') {
    // Cooling: the glow goes out; a troubled turn's slot keeps a faint red ember until the next
    if (isFresh) {
      rules.push(`@keyframes gl{0%{opacity:${LIT}}100%{opacity:0}}@keyframes fl{0%{opacity:1}100%{opacity:${EMBER}}}`)
      rules.push(`.lamp{animation:gl 1.4s cubic-bezier(.2,.6,.3,1) both;animation-delay:${s(-elapsedMs)}}`)
      rules.push(`.flag{animation:fl 1.6s ease-out both;animation-delay:${s(-elapsedMs)}}`)
    }
  }
  // Reduced motion: every state drawn as its still
  const still =
    `@media (prefers-reduced-motion:reduce){.lamp{animation:none;opacity:${mode === 'work' ? LIT : '0'}}` +
    `.flag{animation:none;opacity:${EMBER}}.spill{animation:none}}`
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

export function liveScene(input: SceneInput): string {
  const o = input
  // The ember stays until the next turn starts (which draws with no flag)
  const flag = o.mode === 'work' ? null : (o.flag ?? null)
  const fog = FOG[partOfDay(o.hour)]
  const lamps = G.slots
    .map(
      (sl, i) =>
        `<g opacity="${f(0.85 * G.light[i]!)}"><rect class="lamp l${i}" x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${sl.rx}" fill="url(#lamp)"/></g>`,
    )
    .join('')
  const flagSlot = flag === null ? undefined : G.slots[flag % G.slots.length]!
  const flash = flagSlot
    ? `<g opacity=".55"><rect class="flag" x="${flagSlot.x}" y="${flagSlot.y}" width="${flagSlot.w}" height="${flagSlot.h}" rx="${flagSlot.rx}" fill="url(#red)"/></g>`
    : ''
  const walls = G.slots
    .map(
      sl =>
        `<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" rx="${sl.rx}" class="floor"/>` +
        `<rect x="${f(sl.x + 1.2)}" y="${f(sl.y + sl.h - 3.2)}" width="${f(sl.w - 2.4)}" height="1.4" rx=".7" class="wall"/>`,
    )
    .join('')
  // The plate's spill of light: breathing with the work, cooling with the afterglow
  const isFresh = o.elapsedMs < MOTION_MS
  const spillCss =
    o.mode === 'work'
      ? `.spill{opacity:.5}` + (isFresh ? `.spill{animation:sp 1.2s ease-out both}@keyframes sp{from{opacity:0}to{opacity:.5}}` : '')
      : o.mode === 'done' && isFresh
        ? `.spill{animation:sc 1.4s ease-out both;animation-delay:${s(-o.elapsedMs)}}@keyframes sc{from{opacity:.5}to{opacity:0}}`
        : `.spill{opacity:0}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.ground{fill:#0b0d10}.fogc{stop-color:${fog.dark}}.p0{stop-color:#14161a}.p1{stop-color:#0e1013}
.edge{stroke:#e3e6e9;stroke-opacity:.06}.floor{fill:#08090b}.wall{fill:#e3e6e9;opacity:.035}
.hot{stop-color:${G.brand.hot}}.emb{stop-color:${G.brand.pulse}}.spillc{stop-color:${G.brand.pulse}}.vig{opacity:1}
.reading{fill:#e3e6e9;opacity:.05}.red0{stop-color:#ff6a5c}.red1{stop-color:${G.brand.pulse}}
.lamp{opacity:0}
${lampCss(o.mode, o.elapsedMs, flag)}
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
<radialGradient id="spillg"><stop class="spillc" offset="0" stop-opacity=".3"/><stop class="spillc" offset="1" stop-opacity="0"/></radialGradient>
<radialGradient id="vigg" cx=".5" cy=".62" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="rmx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
<linearGradient id="rmy" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="rmy-m"><rect width="${W}" height="${H}" fill="url(#rmy)"/></mask>
<mask id="rm"><g mask="url(#rmy-m)"><rect width="${W}" height="${H}" fill="url(#rmx)"/></g></mask>
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
