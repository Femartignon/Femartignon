#!/usr/bin/env python3
"""Trilha sintética do vídeo de abertura (bateria de escola de samba + cavaquinho + ambiente).

Fonte única da trilha: os tempos seguem o roteiro V2 (ver CUES em index.html).
Saída: assets/trilha.wav (44.1 kHz, estéreo). Requer numpy.
"""
import wave
from pathlib import Path
import numpy as np

SR = 44100
DUR = 145.0
BEAT = 0.5          # 120 bpm  -> compasso 2/4 = 1,0 s
S16 = BEAT / 4
rng = np.random.default_rng(7)
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)


def add(t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(pan, 0))
    R[i:j] += s * (1 + min(pan, 0))


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)


def lp(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def hp(x, k):
    return x - lp(x, k)


# ---------- instrumentos ----------
def surdo(strong=True):
    n = int(SR * (0.55 if strong else 0.35))
    t = np.arange(n) / SR
    f = 52 + 38 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (0.2 if strong else 0.09))
    skin = lp(rng.standard_normal(n), 12) * np.exp(-t / 0.02) * 0.6
    return (body + skin) * (1.0 if strong else 0.45)


def caixa():
    n = int(SR * 0.12)
    nz = hp(rng.standard_normal(n + 30), 30)[:n]
    t = np.arange(n) / SR
    return (nz * np.exp(-t / 0.035) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.5) * 0.55


def tamborim():
    n = int(SR * 0.07)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.35 + hp(rng.standard_normal(n + 10), 10)[:n] * 0.5) * np.exp(-t / 0.018)


def chocalho(acc=False):
    n = int(SR * 0.06)
    return hp(rng.standard_normal(n + 6), 6)[:n] * env(n, 0.003, 0.02) * (0.5 if acc else 0.28)


def agogo(hi=True):
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 1180 if hi else 860
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.09) * 0.22


def tom():
    n = int(SR * 0.18)
    t = np.arange(n) / SR
    f = 110 + 60 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) * 0.8


def crash(d=1.6):
    n = int(SR * d)
    nz = hp(rng.standard_normal(n + 20), 20)[:n]
    return nz * env(n, 0.002, d / 4) * 0.7


def conv_hit():
    """Convenção: batida forte e seca de toda a bateria."""
    s = np.zeros(int(SR * 0.6))
    for sig, g in ((surdo(True), 1.2), (caixa(), 1.0), (tom(), 0.8), (crash(0.5), 0.5)):
        s[: len(sig)] += sig * g
    return s


def apito():
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    f = 2750 + 90 * np.sin(2 * np.pi * 6 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 34 * t)))
    return s * np.minimum(t / 0.01, 1) * np.minimum((0.9 - t) / 0.08, 1) * 0.35


def pluck(freq, d=0.9):
    n = int(SR * d)
    p = int(SR / freq)
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.4975 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, 0.001, d / 2)


# ---------- grooves ----------
TAM = [1, 0, 1, 1, 0, 1, 0, 1]
AGO = [1, 0, 1, 0, 1, 1, 0, 1]
TAM2 = [1, 1, 0, 1, 1, 0, 1, 1]      # levada diferente (volta da paradinha)
AGO2 = [1, 0, 0, 1, 0, 1, 1, 0]


def groove(t0, t1, k_surdo, k_caixa, k_tam, k_choc, k_ago, alt=False):
    t = t0
    bar = 0
    tam_p, ago_p = (TAM2, AGO2) if alt else (TAM, AGO)
    while t < t1 - 1e-6:
        if k_surdo:
            add(t, surdo(False), 0.5 * k_surdo, -0.2)
            add(t + BEAT, surdo(True), 0.9 * k_surdo, -0.2)
        for s in range(8):
            ts = t + s * S16
            if ts >= t1:
                break
            if k_caixa and (s % 2 == 0 or s in (3, 7)):
                add(ts, caixa(), (0.9 if s % 4 == 0 else 0.55) * k_caixa, 0.15)
            if k_tam and tam_p[s]:
                add(ts, tamborim(), 0.7 * k_tam, 0.3)
            if k_choc:
                add(ts, chocalho(s % 2 == 0), k_choc, -0.3)
            if k_ago and ago_p[s]:
                add(ts, agogo(s % 3 == 0), k_ago, 0.35)
        t += 1.0
        bar += 1


def fill(t0, dur, k=1.0):
    """Virada de caixa/tons."""
    n = int(dur / (S16 / 2))
    for i in range(n):
        ts = t0 + i * (S16 / 2)
        add(ts, caixa(), (0.4 + 0.6 * i / n) * k, 0.1)
        if i % 3 == 0:
            add(ts, tom(), 0.6 * k, -0.1)


# ---------- ambiente (0–8 s) ----------
def ambient():
    n = int(SR * 8.5)
    t = np.arange(n) / SR
    sea = lp(rng.standard_normal(n), 60) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t)) * 5
    traffic = lp(rng.standard_normal(n), 220) * 9
    voices = lp(hp(rng.standard_normal(n + 40), 40)[:n], 14) * (0.4 + 0.6 * np.sin(2 * np.pi * 0.7 * t + 1) ** 2) * 0.5
    a = (sea * 0.5 + traffic * 0.5 + voices) * 0.55
    fade = np.minimum(t / 0.5, 1) * np.clip((8.2 - t) / 1.2, 0, 1)
    return a * fade


add(0, ambient(), 0.9)

# ---------- 0–10 Esquenta: surdo ao longe, ritmo cresce, explosão em 8,0 ----------
for ts in np.arange(2.5, 5.0, 1.0):
    add(ts, surdo(True), 0.25 + (ts - 2.5) * 0.1, -0.2)
t = 5.0
gap = 0.5
while t < 8.0:
    add(t, surdo(True), 0.5 + (t - 5) * 0.12, -0.2)
    add(t + gap / 2, surdo(False), 0.4, -0.2)
    t += gap
    gap = max(0.2, gap - 0.05)
add(7.5, tom(), 0.5)
fill(7.0, 1.0, 0.8)
add(8.0, conv_hit(), 1.0)
add(8.0, crash(2.0), 0.8)
groove(8.0, 28.0, 0.9, 0.55, 0.45, 0.4, 0.5)

# ---------- 28–52 Propósito: cavaquinho / violão leve ----------
CH = [(261.6, 329.6, 392.0), (196.0, 246.9, 293.7), (220.0, 261.6, 329.6), (174.6, 220.0, 261.6)]
bass = [130.8, 98.0, 110.0, 87.3]
for k in range(12):
    t = 28 + k * 2.0
    c = CH[k % 4]
    for q in range(4):
        tq = t + q * BEAT
        for i, f in enumerate(c):
            add(tq + i * 0.012, pluck(f * 2, 0.5), 0.12 if q % 2 else 0.17, 0.35)
    add(t, pluck(bass[k % 4], 1.0), 0.28, -0.3)
    add(t + 1.0, pluck(bass[k % 4] * 1.5, 0.8), 0.18, -0.3)
groove(28.0, 52.0, 0.0, 0, 0, 0.5, 0)
for ts in np.arange(28.0, 52.0, 1.0):
    add(ts + BEAT, surdo(False), 0.22, -0.2)

# ---------- 52–62 Concentração: surdo sozinho; silêncio total; apito + virada ----------
for ts in np.arange(52.0, 61.5, 1.0):
    add(ts, surdo(False), 0.7, -0.1)
    add(ts + BEAT, surdo(True), 1.0, -0.1)
# 61,5–62,7 silêncio total
add(62.7, apito(), 1.0)
fill(62.75, 0.7, 1.1)
add(63.45, conv_hit(), 1.1)

# ---------- 63,5–83,3 Avenida: bateria completa ----------
groove(63.5, 83.5, 1.1, 0.9, 0.75, 0.55, 0.7)
add(83.5, conv_hit(), 1.0)
# 83,5–92 paradinha: silêncio quase total

# ---------- 92–98 volta mais forte, levada diferente ----------
add(92.0, conv_hit(), 1.3)
add(92.0, crash(1.8), 0.7)
groove(92.5, 98.0, 1.2, 0.95, 0.9, 0.6, 0.9, alt=True)

# ---------- 98–112 Grito: convenções nas palavras-chave ----------
groove(98.0, 112.0, 1.15, 0.95, 0.8, 0.55, 0.8)
for ts in (98.5, 102.5, 107.5):
    add(ts, conv_hit(), 1.4)

# ---------- 112–125 Escola: crescendo até o ponto mais alto ----------
for k, tt in enumerate(np.arange(112.0, 125.0, 1.0)):
    g = 0.7 + 0.6 * min(k / 8.0, 1)
    groove(tt, tt + 1.0, g, 0.8 * g, 0.75 * g, 0.5, 0.7 * g, alt=True)
fill(119.3, 0.7, 1.0)
add(120.0, conv_hit(), 1.5)
add(120.0, crash(2.0), 0.9)

# ---------- 125–145 Desfile ----------
groove(125.0, 130.0, 1.1, 0.9, 0.75, 0.55, 0.7)
add(130.0, conv_hit(), 1.0)
# 130,0–131,3 silêncio (1 s) + última batida de surdo
add(131.3, surdo(True), 1.4)
groove(131.5, 145.0, 1.2, 1.0, 0.9, 0.6, 0.85)
fill(139.8, 1.0, 1.0)
# explosão final + público em 141,0
add(141.0, conv_hit(), 1.6)
add(141.0, crash(3.0), 1.0)
cn = int(SR * 3.5)
tc = np.arange(cn) / SR
crowd = lp(rng.standard_normal(cn), 6) * 10 * np.minimum(tc / 0.15, 1) * np.exp(-tc / 1.6)
add(141.0, crowd, 0.55)

# ---------- master ----------
fade_n = int(SR * 1.0)
fo = np.ones(N)
fo[-fade_n:] = np.linspace(1, 0, fade_n)
L *= fo
R *= fo
peak = max(np.abs(L).max(), np.abs(R).max())
g = 0.89 / peak
out = (np.stack([L, R], 1) * g)
out = np.tanh(out * 1.1) / np.tanh(1.1)
pcm = (out * 32767).astype("<i2")
dest = Path(__file__).resolve().parent.parent / "assets" / "trilha.wav"
with wave.open(str(dest), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", dest, f"{N / SR:.1f}s")
