// A loud test card for /innerpulse probe: shows, at a glance, whether this surface draws the
// backdrop, runs CSS animation in it, runs SMIL animation in it, and reports reduced motion.
// It names what it tests in plain words, since the person reads it off the screen.
export function probeScene(drawnAt: string): string {
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
<text x="0" y="0" font-size="34">innerpulse probe, drawn ${drawnAt}</text>
<rect class="blink" x="0" y="50" width="160" height="160" rx="16" fill="#f43a2a"/>
<text x="190" y="140" font-size="28">CSS: blinks if it runs</text>
<rect x="0" y="260" width="460" height="8" rx="4" fill="#1f2329"/>
<circle cx="20" cy="264" r="22" fill="#7dffb0"><animate attributeName="cx" values="20;440;20" dur="2s" repeatCount="indefinite"/></circle>
<text x="0" y="330" font-size="28">SMIL: the dot slides if it runs</text>
<text class="rm" x="0" y="400" font-size="28" style="fill:#ffb347">reduced motion is ON here</text>
</g>
</svg>`
}
