"""Instrument voices. Each returns a mono (n,) or stereo (2, n) float array
starting at the note onset; songs place them with Stem.add()."""

import math
import zlib
from functools import lru_cache

import numpy as np
from scipy import signal

from engine import SR, TAU, eq, hz, k_osc, k_partials, k_pluck, k_svf


def _t(n):
    return np.arange(n) / SR


def _rng(*key):
    return np.random.default_rng(zlib.crc32(repr(key).encode()))


def adsr(n, gate, a=0.005, d=0.2, s=0.7, r=0.2, curve=1.0):
    t = _t(n)
    a = max(a, 1e-4)
    env = np.where(t < a, (t / a) ** curve, s + (1.0 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    g = min(int(gate * SR), n)
    if g < n:
        lvl = env[g - 1] if g > 0 else 0.0
        env[g:] = lvl * np.exp(-(t[g:] - t[g]) / max(r / 4.6, 1e-4))
    return env


def onepole_lp(x, fc):
    a = 1.0 - math.exp(-TAU * fc / SR)
    return signal.lfilter([a], [1.0, a - 1.0], x)


# --------------------------------------------------------------- keys


def piano(m, dur, vel=0.7, seed=0, bright=1.0):
    """Additive acoustic piano: stretched (inharmonic) partials, two detuned
    strings per note, two-stage decay, hammer thump and damper release."""
    rng = _rng("pno", m, seed)
    f0 = hz(m)
    B = float(np.clip(0.00022 * 2 ** ((m - 60) / 13.0), 4e-5, 0.02))
    K = int(min(56, max(1, 15000 // f0)))
    k = np.arange(1, K + 1, dtype=float)
    fk = k * f0 * np.sqrt(1.0 + B * k * k)
    hard = 0.3 + 0.7 * vel
    strike = np.abs(np.sin(math.pi * k * 0.118)) + 0.08
    amp = strike / k ** (2.1 - 1.1 * hard)
    amp /= np.sqrt(1.0 + (fk / (1400.0 + 6500.0 * hard * bright)) ** 2.4)
    if m < 40:  # the deep strings' fundamental is weak; the ear fills it in
        amp[0] *= 0.55
    amp /= np.sqrt(np.sum(amp**2))
    amp *= vel**1.4 * (f0 / 261.6) ** 0.05

    T = float(np.clip(10.0 * 0.5 ** ((m - 40) / 15.0), 0.45, 16.0))
    tau2 = T / (1.0 + (fk / 1900.0) ** 1.5 + 0.05 * (k - 1))
    tau1 = tau2 * 0.16
    mix = np.full(K, 0.72)

    damper = m < 89
    rel_tau = (0.05 + 0.12 * max(0.0, (60 - m) / 40.0)) if damper else T
    gate = int(dur * SR)
    n = gate + int(rel_tau * 7 * SR) if damper else int(min(T * 5, dur + T * 3) * SR)
    n = min(n, int((dur + 0.2) * SR) + int(min(T * 6, 20.0) * SR))
    n = max(n, int(0.05 * SR))
    att = int(0.0012 * SR)

    y = np.zeros(n)
    detune = 0.00032 + 0.0002 * rng.random()
    strings = (-1.0, 1.0) if m >= 32 else (0.0,)
    for sgn in strings:
        ph = rng.uniform(0, TAU, K)
        y += k_partials(n, fk * (1.0 + sgn * detune), amp / len(strings), ph, tau1, tau2, mix, att, gate, rel_tau)

    # hammer: short felt thump + a little noise
    hn = int(0.03 * SR)
    th = _t(hn)
    thump = np.sin(TAU * min(f0, 180.0) * 0.5 * th) * np.exp(-th / 0.008) * 0.08
    noise = onepole_lp(rng.standard_normal(hn), 1500 + 4000 * hard) * np.exp(-th / 0.004) * 0.06
    y[:hn] += (thump + noise) * vel**1.5
    return y


def epiano(m, dur, vel=0.7, seed=0, bark=1.0):
    """Rhodes-style electric piano: FM tine/body pair plus a short metallic
    'clang' transient; drive grows with velocity."""
    rng = _rng("ep", m, seed)
    f = hz(m)
    rel = 0.22
    tau = float(np.clip(3.4 * (261.6 / f) ** 0.55, 0.7, 7.0))
    n = int(min(dur + rel * 2.5, dur + tau * 4) * SR) + 1
    t = _t(n)
    env = np.exp(-t / tau) * np.minimum(1.0, t / 0.002)
    g = int(dur * SR)
    if g < n:
        env[g:] *= np.exp(-(t[g:] - t[g]) / (rel / 4.6))
    idx = (0.5 + 2.2 * vel**1.7 * bark) * np.exp(-t / (0.25 + 0.4 * (261.6 / f) ** 0.4)) + 0.22
    ph0 = rng.uniform(0, TAU)
    body = np.sin(TAU * f * t + ph0 + idx * np.sin(TAU * f * t))
    clang = np.sin(TAU * f * t + 1.4 * vel * np.sin(TAU * 14.0 * f * t)) * np.exp(-t / 0.018) * 0.3 * vel
    sub = np.sin(TAU * f * t + ph0) * 0.35
    y = (body + clang + sub) * env
    drive = 1.0 + 1.6 * vel * bark
    y = np.tanh(y * drive) / math.tanh(drive)
    return y * vel**1.2 * 0.5 * (f / 261.6) ** -0.15


def bell(m, dur, vel=0.6, ratio=3.5, index=2.2, tau=2.2, seed=0):
    rng = _rng("bell", m, seed)
    f = hz(m)
    n = int((max(dur, tau * 3.5)) * SR)
    t = _t(n)
    ph = rng.uniform(0, TAU)
    I = index * np.exp(-t / (tau * 0.35))
    y = np.sin(TAU * f * t + ph + I * np.sin(TAU * f * ratio * t))
    y = y * np.exp(-t / tau) + 0.25 * np.sin(TAU * f * 2.0 * t) * np.exp(-t / (tau * 0.4))
    y *= np.minimum(1.0, t / 0.0015)
    return y * vel * 0.35


def marimba(m, dur, vel=0.7, seed=0):
    rng = _rng("mar", m, seed)
    f = hz(m)
    n = int(max(dur, 1.3) * SR)
    t = _t(n)
    d = float(np.clip(0.55 * (300 / f) ** 0.5, 0.15, 1.1))
    y = np.sin(TAU * f * t) * np.exp(-t / d)
    y += 0.30 * np.sin(TAU * f * 3.99 * t) * np.exp(-t / (d * 0.18))
    y += 0.08 * np.sin(TAU * f * 9.1 * t) * np.exp(-t / 0.012)
    hn = int(0.006 * SR)
    y[:hn] += onepole_lp(rng.standard_normal(hn), 3000) * np.exp(-_t(hn) / 0.0015) * 0.2
    y *= np.minimum(1.0, t / 0.0008)
    return y * vel * 0.5


# ------------------------------------------------------------- synths


def synth(
    m,
    dur,
    vel=0.8,
    shape=0,
    voices=1,
    detune=0.0,
    cutoff=2000.0,
    env_amt=0.0,
    env_tau=0.2,
    res=0.15,
    a=0.005,
    d=0.3,
    s=0.8,
    r=0.25,
    sub=0.0,
    vib=0.0,
    vib_rate=5.2,
    vib_delay=0.25,
    key_track=0.5,
    stereo=False,
    pw=0.5,
    glide_from=None,
    glide_t=0.06,
    seed=0,
    lfo_cut=0.0,
    lfo_rate=0.2,
):
    """Analog-style subtractive voice: unison band-limited oscillators into a
    resonant state-variable lowpass with its own envelope."""
    rng = _rng("syn", m, seed, shape, voices)
    f = hz(m)
    n = int((dur + r * 1.6) * SR) + 1
    t = _t(n)
    freq = np.full(n, f)
    if glide_from is not None:
        f1 = hz(glide_from)
        freq = f + (f1 - f) * np.exp(-t / glide_t)
    if vib > 0:
        ramp = np.clip((t - vib_delay) / 0.4, 0, 1)
        freq = freq * (1.0 + vib * ramp * np.sin(TAU * vib_rate * t + rng.uniform(0, TAU)))
    chans = [np.zeros(n), np.zeros(n)]
    offs = np.linspace(-1, 1, voices) if voices > 1 else np.zeros(1)
    for i, o in enumerate(offs):
        fr = freq * 2 ** (o * detune / 1200.0)
        v = k_osc(fr, shape, rng.random(), pw)
        if stereo and voices > 1:
            w = 0.5 + 0.5 * o
            chans[0] += v * (1 - w) * 2 / voices
            chans[1] += v * w * 2 / voices
        else:
            chans[0] += v / voices
    if sub > 0:
        sv = k_osc(freq * 0.5, 3, 0.0, 0.5) * sub
        chans[0] += sv
        if stereo:
            chans[1] += sv
    fc = cutoff * 2 ** (key_track * (m - 60) / 12.0) + env_amt * np.exp(-t / env_tau)
    if lfo_cut:
        fc = fc * 2 ** (lfo_cut * np.sin(TAU * lfo_rate * t + rng.uniform(0, TAU)))
    env = adsr(n, dur, a, d, s, r)
    outs = []
    for c in range(2 if stereo else 1):
        outs.append(k_svf(chans[c], fc, res, 0) * env * vel)
    return np.vstack(outs) * 0.5 if stereo else outs[0] * 0.5


def pad(m, dur, vel=0.6, cutoff=1400.0, voices=7, detune=14.0, a=1.2, r=2.0, shape=0, lfo_cut=0.25, seed=0):
    return synth(
        m,
        dur,
        vel,
        shape=shape,
        voices=voices,
        detune=detune,
        cutoff=cutoff,
        res=0.1,
        a=a,
        d=1.5,
        s=0.85,
        r=r,
        key_track=0.25,
        stereo=True,
        lfo_cut=lfo_cut,
        lfo_rate=0.11,
        vib=0.0015,
        vib_rate=0.35,
        vib_delay=0.0,
        seed=seed,
    )


def strings(m, dur, vel=0.6, seed=0, cutoff=2600.0, a=0.6, r=1.0):
    """Ensemble strings: detuned saws with slow vibrato, darker filter."""
    return synth(
        m,
        dur,
        vel,
        shape=0,
        voices=5,
        detune=9.0,
        cutoff=cutoff,
        res=0.05,
        a=a,
        d=2.0,
        s=0.9,
        r=r,
        key_track=0.4,
        stereo=True,
        vib=0.004,
        vib_rate=5.0,
        vib_delay=0.3,
        seed=seed,
    )


def subbass(m, dur, vel=0.8, harm=0.18, drive=1.4, r=0.05):
    f = hz(m)
    n = int((dur + r * 2) * SR)
    t = _t(n)
    bend = 2 ** ((0.25 * np.exp(-t / 0.015)) / 12.0)
    ph = TAU * np.cumsum(f * bend) / SR
    y = np.sin(ph) + harm * np.sin(2 * ph) + harm * 0.35 * np.sin(3 * ph)
    y = np.tanh(y * drive) / math.tanh(drive)
    return y * adsr(n, dur, 0.006, 0.4, 0.85, r) * vel * 0.6


def flute(m, dur, vel=0.6, seed=0):
    rng = _rng("fl", m, seed)
    f = hz(m)
    n = int((dur + 0.25) * SR)
    t = _t(n)
    vibr = 1.0 + 0.0045 * np.clip((t - 0.25) / 0.5, 0, 1) * np.sin(TAU * 5.1 * t + rng.uniform(0, TAU))
    ph = TAU * np.cumsum(f * vibr) / SR
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.4) + 0.07 * np.sin(3 * ph + 1.1)
    breath = k_svf(rng.standard_normal(n), np.full(n, f * 2.0), 0.6, 1) * 0.18
    breath += eq(rng.standard_normal(n)[None, :], ("hp", 3500.0), periodic=False)[0] * 0.02
    env = adsr(n, dur, 0.07, 0.3, 0.85, 0.18)
    chiff = np.exp(-t / 0.03) * 0.5
    return (tone + breath * (1 + chiff)) * env * vel * 0.35


# ----------------------------------------------------------- strings


def guitar(m, dur, vel=0.7, bright=0.55, seed=0, t60=None, mute=False):
    """Plucked string (Karplus-Strong) with pick-position comb and a short
    pick transient. Body resonance is an EQ on the guitar stem."""
    rng = _rng("gtr", m, seed)
    f = hz(m)
    if t60 is None:
        t60 = float(np.clip(5.0 * (196.0 / f) ** 0.55, 1.2, 9.0))
    if mute:
        t60 = 0.22
    period = int(SR / f)
    exc = rng.uniform(-1, 1, period)
    fc = 500 + 4800 * bright * vel
    exc = onepole_lp(onepole_lp(exc, fc), fc * 1.5)
    pp = max(1, int(period * (0.13 + 0.05 * rng.random())))
    exc = exc - np.roll(exc, pp)
    exc -= exc.mean()
    exc /= np.max(np.abs(exc)) + 1e-9
    damp = float(np.clip(0.5 - 0.38 * bright, 0.08, 0.5))
    n = int((dur + 0.35) * SR)
    y = k_pluck(f, n, t60, damp, exc, int(dur * SR), 0.09)
    ramp = int(0.0006 * SR)
    y[:ramp] *= np.linspace(0, 1, ramp)
    cn = int(0.004 * SR)
    y[:cn] += eq(rng.standard_normal(cn)[None, :], ("hp", 2500.0), periodic=False)[0] * np.exp(-_t(cn) / 0.001) * 0.03 * vel
    return y * vel * 0.45


def upright(m, dur, vel=0.75, seed=0):
    """Upright/acoustic bass: dark plucked string plus finger thump."""
    rng = _rng("ub", m, seed)
    f = hz(m)
    period = int(SR / f)
    exc = onepole_lp(rng.uniform(-1, 1, period), 600 + 900 * vel)
    exc = exc - np.roll(exc, max(1, int(period * 0.2)))
    exc /= np.max(np.abs(exc)) + 1e-9
    n = int((dur + 0.2) * SR)
    y = k_pluck(f, n, 2.4, 0.42, exc, int(dur * SR), 0.12)
    t = _t(n)
    y += np.sin(TAU * f * t) * np.exp(-t / 0.09) * 0.35 * np.minimum(1, t / 0.003)
    return y * vel * 0.8


# -------------------------------------------------------------- drums
# Each drum has a few round-robin variants so repeated hits don't sound
# machine-identical; `var` picks one.


@lru_cache(maxsize=None)
def kick(kind="lofi", var=0):
    rng = _rng("kick", kind, var)
    p = {
        "lofi": (46.0, 120.0, 0.045, 0.42, 0.25, 1.6),
        "soft": (48.0, 95.0, 0.05, 0.38, 0.06, 1.2),
        "house": (49.0, 170.0, 0.032, 0.42, 0.45, 2.0),
        "synth": (50.0, 210.0, 0.024, 0.34, 0.6, 2.4),
        "pop": (52.0, 160.0, 0.03, 0.32, 0.5, 1.8),
    }[kind]
    f_end, f_start, ptau, dec, click, drive = p
    n = int(dec * 2.6 * SR)
    t = _t(n)
    fr = f_end + (f_start - f_end) * np.exp(-t / ptau)
    ph = TAU * np.cumsum(fr) / SR
    body = np.sin(ph) * np.exp(-((t / dec) ** 1.6))
    cn = int(0.012 * SR)
    cl = np.zeros(n)
    cl[:cn] = eq(rng.standard_normal(cn)[None, :], ("bp", 3200.0, 0.8), periodic=False)[0] * np.exp(-_t(cn) / 0.0025)
    y = np.tanh((body + cl * click) * drive) / math.tanh(drive)
    y *= np.minimum(1.0, t / 0.0006)
    if kind == "lofi":
        y = eq(y[None, :], ("lp", 3500.0), ("peak", 70.0, 3.0, 1.0), periodic=False)[0]
    return y * 0.9


@lru_cache(maxsize=None)
def snare(kind="lofi", var=0):
    rng = _rng("snare", kind, var)
    tone_f, ntau, nlp, body_amt, noise_amt = {
        "lofi": (180.0, 0.11, 5200.0, 0.55, 0.65),
        "tight": (200.0, 0.09, 9000.0, 0.5, 0.7),
        "synth": (185.0, 0.16, 10000.0, 0.6, 0.8),
        "brush": (210.0, 0.07, 6000.0, 0.15, 0.5),
    }[kind]
    n = int(0.5 * SR)
    t = _t(n)
    fr = tone_f * (1 + 0.35 * np.exp(-t / 0.01))
    ph = TAU * np.cumsum(fr) / SR
    body = (np.sin(ph) + 0.5 * np.sin(ph * 1.78)) * np.exp(-t / 0.045) * body_amt
    noise = rng.standard_normal(n)
    noise = eq(noise[None, :], ("hp", 1200.0), ("lp", nlp), ("peak", 4200.0, 3.0, 0.8), periodic=False)[0]
    noise *= np.exp(-t / ntau) * noise_amt
    y = (body + noise) * np.minimum(1.0, t / 0.0005)
    y = np.tanh(y * 1.4) / math.tanh(1.4)
    if kind == "lofi":
        y = eq(y[None, :], ("lp", 6500.0), periodic=False)[0]
    return y * 0.7


@lru_cache(maxsize=None)
def clap(var=0):
    rng = _rng("clap", var)
    n = int(0.45 * SR)
    t = _t(n)
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.009, 0.019, 0.027)):
        i = int(off * SR)
        tt = t[i:] - t[i]
        env[i:] += np.exp(-tt / (0.006 if k < 3 else 0.11)) * (0.8 if k < 3 else 1.0)
    noise = eq(rng.standard_normal(n)[None, :], ("bp", 1300.0, 1.1), ("hp", 700.0), periodic=False)[0]
    return np.tanh(noise * env * 1.8) * 0.5


@lru_cache(maxsize=None)
def hat(open_=False, var=0, tone=1.0):
    rng = _rng("hat", open_, var, tone)
    n = int((0.6 if open_ else 0.12) * SR)
    t = _t(n)
    ratios = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.4 * tone
    metal = np.zeros(n)
    for r in ratios:
        metal += np.sign(np.sin(TAU * r * t + rng.uniform(0, TAU)))
    metal = metal / 6 + rng.standard_normal(n) * 0.5
    y = eq(metal[None, :], ("hp", 7000.0), ("peak", 10000.0, 3.0, 1.0), ("lp", 15000.0), periodic=False)[0]
    dec = 0.16 if open_ else 0.022 + 0.006 * var
    y *= np.exp(-t / dec) * np.minimum(1.0, t / 0.0004)
    return y * 0.45


@lru_cache(maxsize=None)
def ride(var=0, bell_=False):
    rng = _rng("ride", var, bell_)
    n = int(1.6 * SR)
    t = _t(n)
    parts = rng.uniform(2800, 9000, 24)
    y = np.zeros(n)
    for p in parts:
        y += np.sin(TAU * p * t + rng.uniform(0, TAU)) * np.exp(-t / rng.uniform(0.25, 0.9))
    y = y / 8 + rng.standard_normal(n) * np.exp(-t / 0.35) * 0.4
    if bell_:
        for p in (1450.0, 2100.0, 3550.0):
            y += np.sin(TAU * p * t) * np.exp(-t / 0.6) * 0.6
    y = eq(y[None, :], ("hp", 2500.0), ("lp", 12000.0), periodic=False)[0]
    y *= np.exp(-t / 0.55) * np.minimum(1.0, t / 0.0007)
    stick = np.exp(-t / 0.004) * rng.standard_normal(n) * 0.3
    return (y + eq(stick[None, :], ("bp", 5000.0, 1.0), periodic=False)[0]) * 0.3


@lru_cache(maxsize=None)
def crash(var=0):
    rng = _rng("crash", var)
    n = int(3.0 * SR)
    t = _t(n)
    y = rng.standard_normal(n)
    for p in rng.uniform(3000, 11000, 30):
        y += np.sin(TAU * p * t + rng.uniform(0, TAU)) * 0.5
    y = eq(y[None, :], ("hp", 3500.0), ("lp", 13000.0), periodic=False)[0]
    return y * np.exp(-t / 0.9) * np.minimum(1.0, t / 0.001) * 0.15


@lru_cache(maxsize=None)
def shaker(var=0, dec=0.045):
    rng = _rng("shk", var)
    n = int(0.15 * SR)
    t = _t(n)
    env = (t / 0.012) * np.exp(1 - t / 0.012) if dec < 0 else np.minimum(1, t / 0.008) * np.exp(-t / dec)
    y = eq(rng.standard_normal(n)[None, :], ("hp", 5500.0), ("lp", 13000.0), periodic=False)[0]
    return y * env * 0.3


@lru_cache(maxsize=None)
def rim(var=0):
    rng = _rng("rim", var)
    n = int(0.08 * SR)
    t = _t(n)
    y = np.sin(TAU * 1750 * t) * np.exp(-t / 0.006) + np.sin(TAU * 480 * t) * np.exp(-t / 0.012) * 0.6
    y += eq(rng.standard_normal(n)[None, :], ("bp", 3000.0, 1.2), periodic=False)[0] * np.exp(-t / 0.003)
    return y * 0.35


@lru_cache(maxsize=None)
def brush(kind="tap", var=0, length=0.35):
    rng = _rng("brush", kind, var, length)
    n = int((length if kind == "sweep" else 0.25) * SR)
    t = _t(n)
    noise = eq(rng.standard_normal(n)[None, :], ("bp", 3500.0, 0.6), ("lp", 8000.0), periodic=False)[0]
    if kind == "sweep":
        env = np.sin(math.pi * t / t[-1]) ** 1.5 * 0.35
    else:
        env = np.minimum(1, t / 0.002) * np.exp(-t / 0.05)
    return noise * env * 0.35


@lru_cache(maxsize=None)
def cajon(slap=False, var=0):
    rng = _rng("caj", slap, var)
    n = int(0.4 * SR)
    t = _t(n)
    if slap:
        y = eq(rng.standard_normal(n)[None, :], ("bp", 2400.0, 0.9), periodic=False)[0] * np.exp(-t / 0.06) * 0.8
        y += np.sin(TAU * 260 * t) * np.exp(-t / 0.03) * 0.4
    else:
        fr = 70 + 60 * np.exp(-t / 0.012)
        y = np.sin(TAU * np.cumsum(fr) / SR) * np.exp(-t / 0.12)
        y += onepole_lp(rng.standard_normal(n), 600) * np.exp(-t / 0.02) * 0.3
    return np.tanh(y * 1.3) * 0.6


@lru_cache(maxsize=None)
def tom(m=45, var=0):
    rng = _rng("tom", m, var)
    n = int(0.7 * SR)
    t = _t(n)
    f = hz(m)
    fr = f * (1 + 0.5 * np.exp(-t / 0.04))
    y = np.sin(TAU * np.cumsum(fr) / SR) * np.exp(-t / 0.25)
    y += onepole_lp(rng.standard_normal(n), 3000) * np.exp(-t / 0.02) * 0.2
    return np.tanh(y * 1.5) * 0.55


# ------------------------------------------------------------ textures


def vinyl(n, seed=0, density=7.0, level=1.0):
    rng = np.random.default_rng(seed)
    hiss = eq(rng.standard_normal((2, n)), ("lp", 7000.0), ("hp", 300.0)) * 0.004
    crackle = np.zeros((2, n))
    count = int(n / SR * density)
    pos = rng.integers(0, n - 200, count)
    amps = rng.lognormal(-3.2, 0.9, count)
    for p, a in zip(pos, amps):
        ln = rng.integers(8, 60)
        click = rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 4))
        c = rng.integers(0, 2)
        crackle[c, p : p + ln] += click * a
        crackle[1 - c, p : p + ln] += click * a * 0.6
    crackle = eq(crackle, ("hp", 900.0), ("lp", 9000.0))
    rumble = eq(rng.standard_normal((2, n)), ("lp", 60.0)) * 0.01
    return (hiss + np.clip(crackle, -0.3, 0.3) + rumble) * level


def wind(n, seed=0, level=1.0, center=700.0):
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    # whole cycles over the buffer so the loop point is seamless
    rate = max(1, round(0.05 * n / SR)) / (n / SR)
    for c in range(2):
        fc = center * 2 ** (0.9 * np.sin(TAU * rate * t + c * 1.3 + rng.uniform(0, TAU)))
        out[c] = k_svf(rng.standard_normal(n), fc, 0.5, 1)
    swell = 0.6 + 0.4 * np.sin(TAU * t / (n / SR) * 3)
    return out * swell * 0.05 * level
