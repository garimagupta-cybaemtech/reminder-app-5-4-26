import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "artifacts", "reminder-app", "assets", "sounds");

function writeWav(filename, samples, sampleRate = 22050) {
  const numSamples = samples.length;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  let off = 0;
  buffer.write("RIFF", off); off += 4;
  buffer.writeUInt32LE(36 + dataSize, off); off += 4;
  buffer.write("WAVE", off); off += 4;
  buffer.write("fmt ", off); off += 4;
  buffer.writeUInt32LE(16, off); off += 4;
  buffer.writeUInt16LE(1, off); off += 2;
  buffer.writeUInt16LE(numChannels, off); off += 2;
  buffer.writeUInt32LE(sampleRate, off); off += 4;
  buffer.writeUInt32LE(byteRate, off); off += 4;
  buffer.writeUInt16LE(blockAlign, off); off += 2;
  buffer.writeUInt16LE(bitsPerSample, off); off += 2;
  buffer.write("data", off); off += 4;
  buffer.writeUInt32LE(dataSize, off); off += 4;
  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 0x7fff) | 0, off);
    off += 2;
  }
  writeFileSync(join(OUT, filename), buffer);
  console.log(`wrote ${filename} (${dataSize} bytes)`);
}

// helpers
const SR = 22050;
function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t); }
function envelope(i, n, attack = 0.02, release = 0.2) {
  const t = i / n;
  if (t < attack) return t / attack;
  if (t > 1 - release) return (1 - t) / release;
  return 1;
}

// 1) Bell - fundamental + overtones, exponential decay (1.5s)
{
  const dur = 1.5;
  const n = (dur * SR) | 0;
  const samples = new Float32Array(n);
  const f = 880;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const decay = Math.exp(-3 * t);
    const s =
      sine(f, t) * 0.55 +
      sine(f * 2.01, t) * 0.30 +
      sine(f * 3.04, t) * 0.18 +
      sine(f * 4.07, t) * 0.10;
    samples[i] = s * decay * 0.7;
  }
  writeWav("bell.wav", samples, SR);
}

// 2) Chime - 3 ascending notes (C5, E5, G5)
{
  const notes = [523.25, 659.25, 783.99];
  const noteDur = 0.35;
  const n = (notes.length * noteDur * SR) | 0;
  const samples = new Float32Array(n);
  const noteN = (noteDur * SR) | 0;
  for (let k = 0; k < notes.length; k++) {
    for (let i = 0; i < noteN; i++) {
      const t = i / SR;
      const decay = Math.exp(-2.5 * t);
      const s =
        sine(notes[k], t) * 0.6 +
        sine(notes[k] * 2, t) * 0.25;
      samples[k * noteN + i] = s * decay * 0.6;
    }
  }
  writeWav("chime.wav", samples, SR);
}

// 3) Beep - urgent triple beep
{
  const dur = 1.2;
  const n = (dur * SR) | 0;
  const samples = new Float32Array(n);
  const beepN = (0.12 * SR) | 0;
  const gapN = (0.08 * SR) | 0;
  let pos = 0;
  for (let b = 0; b < 5; b++) {
    for (let i = 0; i < beepN && pos < n; i++, pos++) {
      const t = i / SR;
      samples[pos] = sine(1000, t) * envelope(i, beepN, 0.005, 0.05) * 0.7;
    }
    pos += gapN;
  }
  writeWav("beep.wav", samples, SR);
}

// 4) Gentle - soft pad with slow swell (2s)
{
  const dur = 2.0;
  const n = (dur * SR) | 0;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = envelope(i, n, 0.4, 0.4);
    const s =
      sine(440, t) * 0.35 +
      sine(554.37, t) * 0.25 + // C#5
      sine(659.25, t) * 0.20;  // E5
    samples[i] = s * env * 0.45;
  }
  writeWav("gentle.wav", samples, SR);
}

// 5) Marimba - plucky percussion-like (1s)
{
  const dur = 1.0;
  const n = (dur * SR) | 0;
  const samples = new Float32Array(n);
  const f = 587.33; // D5
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const decay = Math.exp(-6 * t);
    const s =
      sine(f, t) * 0.55 +
      sine(f * 4, t) * 0.20 * Math.exp(-12 * t);
    samples[i] = s * decay * 0.7;
  }
  writeWav("marimba.wav", samples, SR);
}

console.log("done");
