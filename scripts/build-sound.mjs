// Writes sounds/done.wav: a soft, short two-partial tick for a long turn's end. Synthesized, no samples.
import { writeFileSync, mkdirSync } from 'node:fs'
const rate = 44100, secs = 0.22, n = Math.floor(rate * secs)
const data = Buffer.alloc(n * 2)
for (let i = 0; i < n; i++) {
  const t = i / rate
  const attack = Math.min(1, t / 0.004)
  const env = attack * Math.exp(-t * 26)
  const v = 0.22 * env * (Math.sin(2 * Math.PI * 660 * t) * 0.7 + Math.sin(2 * Math.PI * 990 * t) * 0.3 * Math.exp(-t * 18))
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2)
}
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24)
h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
mkdirSync(new URL('../sounds/', import.meta.url), { recursive: true })
writeFileSync(new URL('../sounds/done.wav', import.meta.url), Buffer.concat([h, data]))
console.log('done.wav', 44 + data.length, 'bytes')
