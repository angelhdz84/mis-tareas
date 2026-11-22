/* Genera los tonos WAV de alerta de Mis Tareas Mini en Movil/sonidos/.
   Sin dependencias: node scripts/tonos-mini.mjs
   Formato mono 22050 Hz 16-bit PCM; cada tono dura ≤0,9 s (para que el
   patrón de 3 repeticiones con separación de 900 ms no se solape). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 22050;
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const salida = join(raiz, "Movil", "sonidos");
mkdirSync(salida, { recursive: true });

function wav(muestras){
  const n = muestras.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);      // PCM
  buf.writeUInt16LE(1, 22);      // mono
  buf.writeUInt32LE(SR, 24);     // muestreo
  buf.writeUInt32LE(SR * 2, 28); // bytes/seg
  buf.writeUInt16LE(2, 32);      // bloque
  buf.writeUInt16LE(16, 34);     // bits
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for(let i = 0; i < n; i++){
    const s = Math.max(-1, Math.min(1, muestras[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

function tono(nombre, dur, fn){
  const n = Math.round(dur * SR);
  const m = new Float64Array(n);
  for(let i = 0; i < n; i++){
    const t = i / SR;
    // bordes suaves de 5 ms para evitar clics
    const borde = Math.min(1, t / 0.005) * Math.min(1, (dur - t) / 0.005);
    m[i] = fn(t) * borde;
  }
  const buf = wav(m);
  writeFileSync(join(salida, nombre), buf);
  console.log(nombre, buf.length, "bytes");
}

// Doble pitido corto (el beep clásico, ahora como archivo)
tono("doble-pitido.wav", 0.40, t=>{
  const beep = t0 => (t >= t0 && t < t0 + 0.16)
    ? Math.sin(2 * Math.PI * 880 * (t - t0)) * 0.7 + Math.sin(2 * Math.PI * 1174.7 * (t - t0)) * 0.3
    : 0;
  return beep(0) + beep(0.18);
});

// Campana: armónnicos con decaimiento exponencial
tono("campana.wav", 0.90, t=>{
  const d = Math.exp(-t * 4.5);
  return (Math.sin(2 * Math.PI * 880 * t) * 0.45
        + Math.sin(2 * Math.PI * 1320 * t) * 0.30
        + Math.sin(2 * Math.PI * 1760 * t) * 0.18
        + Math.sin(2 * Math.PI * 2640 * t) * 0.09) * d;
});

// Alarma: pulsos alternos 880/660 Hz
tono("alarma.wav", 0.90, t=>{
  const i = Math.floor(t / 0.15);
  const f = i % 2 ? 660 : 880;
  const tp = t - i * 0.15;
  const e = Math.min(1, tp / 0.01) * Math.min(1, (0.15 - tp) / 0.03);
  return Math.sin(2 * Math.PI * f * t) * 0.85 * e;
});

// Melodía: arpegio C5–E5–G5–C6
tono("melodia.wav", 0.84, t=>{
  const notas = [523.25, 659.25, 783.99, 1046.5];
  const i = Math.min(3, Math.floor(t / 0.21));
  const tp = t - i * 0.21;
  const e = Math.min(1, tp / 0.01) * Math.min(1, (0.21 - tp) / 0.05);
  return (Math.sin(2 * Math.PI * notas[i] * tp) * 0.7
        + Math.sin(2 * Math.PI * notas[i] * 2 * tp) * 0.15) * e;
});

// Pulso grave: dos golpes bajos 220/440 Hz
tono("pulso.wav", 0.50, t=>{
  const p = t0 => (t >= t0 && t < t0 + 0.22)
    ? (() => { const tp = t - t0;
        const e = Math.min(1, tp / 0.01) * Math.min(1, (0.22 - tp) / 0.06);
        return (Math.sin(2 * Math.PI * 220 * tp) * 0.8 + Math.sin(2 * Math.PI * 440 * tp) * 0.4) * e; })()
    : 0;
  return p(0) + p(0.26);
});

console.log("Tonos escritos en", salida);
