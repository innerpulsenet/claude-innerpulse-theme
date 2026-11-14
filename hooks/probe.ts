// A loud test card for /innerpulse probe card: shows, at a glance, whether this surface draws the
// backdrop, runs CSS animation in it, runs SMIL animation in it, and reports reduced motion.
// It names what it tests in plain words, since the person reads it off the screen.
export function probeScene(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
.blink{animation:bl 1s steps(2,jump-none) infinite}
@keyframes bl{from{opacity:1}to{opacity:.12}}
.rm{display:none}
@media (prefers-reduced-motion:reduce){.rm{display:inline}}
text{font-family:ui-monospace,monospace;fill:#e3e6e9}
</style>
<rect width="1600" height="1000" fill="#0b0d10"/>
<g transform="translate(1000 160)">
<text x="0" y="0" font-size="34">innerpulse probe card</text>
<rect class="blink" x="0" y="50" width="160" height="160" rx="16" fill="#f43a2a"/>
<text x="190" y="140" font-size="28">CSS: blinks if it runs</text>
<rect x="0" y="260" width="460" height="8" rx="4" fill="#1f2329"/>
<circle cx="20" cy="264" r="22" fill="#7dffb0"><animate attributeName="cx" values="20;440;20" dur="2s" repeatCount="indefinite"/></circle>
<text x="0" y="330" font-size="28">SMIL: the dot slides if it runs</text>
<text class="rm" x="0" y="400" font-size="28" style="fill:#ffb347">reduced motion is ON here</text>
</g>
</svg>`
}

// The simplest live mark, for /innerpulse probe simple: the six bars of the beat, large and faint at
// the right, light passing through them in turn. No glass is set with it, no filter, no nested
// drawing, no color-scheme rules: only what the theme-examples scenes use.
export function simpleScene(bars: readonly { x: number; y: number; w: number; h: number; rx: number }[]): string {
  const lit = bars
    .map((_, i) => `.b${i}{animation:pass 4.8s ease-in-out ${(i * 0.32).toFixed(2)}s infinite}`)
    .join('')
  const rects = bars
    .map(
      (b, i) =>
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.rx}" fill="#e3e6e9" opacity=".05"/>` +
        `<rect class="lit b${i}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.rx}" fill="#ffd9c2"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
.lit{opacity:0}
@keyframes pass{0%{opacity:0}12%{opacity:.22}30%{opacity:0}100%{opacity:0}}
${lit}
@media (prefers-reduced-motion: reduce){.lit{animation:none}}
</style>
<rect width="1600" height="1000" fill="#0b0d10"/>
<g transform="translate(1300 330) scale(1.6)">${rects}</g>
</svg>`
}
