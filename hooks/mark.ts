// The mark scene (the default): the six bars of the beat, large and faint at the right, with a
// soft warm light passing through them in turn every 4.8 s. It uses only what the theme-examples
// scenes use: CSS animation, no filter, no nested drawing, no color-scheme rules. Made for a dark
// window; the theme asks the window to be dark.
export function markScene(bars: readonly { x: number; y: number; w: number; h: number; rx: number }[]): string {
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
