"""DSP core for the bundled background-music tracks.

Every buffer here is *periodic*: notes that run past the end wrap around to
the start, and stateful effects (reverb, delay, compression) run over a
warm-up copy of the buffer's own tail first. The rendered track therefore
loops with no seam and no reverb tail chopped off at the loop point.
"""

import math
import os

import numba as nb
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d

SR = 44100
TAU = 2.0 * math.pi


def hz(m):
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def dbg(db):
    return 10.0 ** (db / 20.0)


# --------------------------------------------------------------- kernels


@nb.njit(cache=True, fastmath=True)
def _blep(t, dt):
    if t < dt:
        t /= dt
        return t + t - t * t - 1.0
    if t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@nb.njit(cache=True, fastmath=True)
def k_osc(freq, shape, phase, pw):
    """Band-limited oscillator. shape: 0 saw, 1 pulse, 2 triangle, 3 sine."""
    n = freq.shape[0]
    y = np.empty(n)
    for i in range(n):
        dt = freq[i] / SR
        if shape == 0:
            y[i] = 2.0 * phase - 1.0 - _blep(phase, dt)
        elif shape == 1:
            v = 1.0 if phase < pw else -1.0
            v += _blep(phase, dt)
            p2 = phase - pw
            if p2 < 0.0:
                p2 += 1.0
            v -= _blep(p2, dt)
            y[i] = v
        elif shape == 2:
            y[i] = 4.0 * abs(phase - 0.5) - 1.0
        else:
            y[i] = math.sin(TAU * phase)
        phase += dt
        if phase >= 1.0:
            phase -= 1.0
    return y


@nb.njit(cache=True, fastmath=True)
def k_svf(x, fc, res, mode):
    """Trapezoidal state-variable filter, per-sample cutoff.

    res 0..0.98; mode 0 lowpass, 1 bandpass (unity peak), 2 highpass.
    """
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 2.0 - 2.0 * res
    for i in range(n):
        f = fc[i]
        if f > SR * 0.45:
            f = SR * 0.45
        elif f < 8.0:
            f = 8.0
        g = math.tan(math.pi * f / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = k * v1
        else:
            y[i] = x[i] - k * v1 - v2
    return y


@nb.njit(cache=True, fastmath=True)
def k_pluck(freq, n, t60, damp, exc, rel_i, rel_t60):
    """Extended Karplus-Strong string, allpass-tuned so pitch is exact."""
    period = SR / freq
    d = period - damp
    ni = int(d)
    frac = d - ni
    if frac < 0.25:
        ni -= 1
        frac += 1.0
    c = (1.0 - frac) / (1.0 + frac)
    buf = np.zeros(ni)
    for i in range(min(exc.shape[0], ni)):
        buf[i] = exc[i]
    g = 10.0 ** (-3.0 / (t60 * freq))
    gr = 10.0 ** (-3.0 / (rel_t60 * freq))
    y = np.zeros(n)
    p = 0
    prev = 0.0
    ax = 0.0
    ay = 0.0
    for i in range(n):
        s = buf[p]
        y[i] = s
        lp = (1.0 - damp) * s + damp * prev
        prev = s
        ap = c * lp + ax - c * ay
        ax = lp
        ay = ap
        buf[p] = ap * (g if i < rel_i else gr)
        p += 1
        if p >= ni:
            p = 0
    return y


@nb.njit(cache=True, fastmath=True)
def k_partials(n, freqs, amps, phases, tau1, tau2, mix, att_n, rel_i, rel_tau):
    """Sum of exponentially decaying sinusoids (two-stage decay + damper)."""
    y = np.zeros(n)
    mr = math.exp(-1.0 / (rel_tau * SR))
    for k in range(freqs.shape[0]):
        if freqs[k] > SR * 0.45:
            continue
        w = TAU * freqs[k] / SR
        cw = math.cos(w)
        sw = math.sin(w)
        c = math.cos(phases[k])
        s = math.sin(phases[k])
        m1 = math.exp(-1.0 / (tau1[k] * SR))
        m2 = math.exp(-1.0 / (tau2[k] * SR))
        e1 = amps[k] * mix[k]
        e2 = amps[k] * (1.0 - mix[k])
        floor = amps[k] * 1e-4
        rel = 1.0
        for i in range(n):
            env = (e1 + e2) * rel
            if i < att_n:
                env *= i / att_n
            y[i] += env * s
            c2 = c * cw - s * sw
            s = c * sw + s * cw
            c = c2
            e1 *= m1
            e2 *= m2
            if i >= rel_i:
                rel *= mr
            if (i & 1023) == 0:
                norm = 1.0 / math.sqrt(c * c + s * s)
                c *= norm
                s *= norm
                if i > att_n and (e1 + e2) * rel < floor:
                    break
    return y


@nb.njit(cache=True, fastmath=True)
def k_vdelay(x, dl):
    """Variable delay line (delay in samples per output sample, linear interp)."""
    n = x.shape[0]
    size = 1
    for i in range(n):
        if dl[i] + 4 > size:
            size = int(dl[i]) + 4
    buf = np.zeros(size)
    y = np.empty(n)
    w = 0
    for i in range(n):
        buf[w] = x[i]
        rp = w - dl[i]
        while rp < 0.0:
            rp += size
        i0 = int(rp)
        fr = rp - i0
        i1 = i0 + 1
        if i1 >= size:
            i1 -= size
        y[i] = buf[i0] * (1.0 - fr) + buf[i1] * fr
        w += 1
        if w >= size:
            w = 0
    return y


@nb.njit(cache=True, fastmath=True)
def k_pingpong(l, r, d, fb, lpc, hpc):
    n = l.shape[0]
    L = np.zeros(n)
    R = np.zeros(n)
    bl = np.zeros(d)
    br = np.zeros(d)
    p = 0
    zl = 0.0
    zr = 0.0
    hl = 0.0
    hr = 0.0
    for i in range(n):
        ol = bl[p]
        orr = br[p]
        L[i] = ol
        R[i] = orr
        inl = (l[i] + r[i]) * 0.5 + orr * fb
        inr = ol * fb
        zl += lpc * (inl - zl)
        zr += lpc * (inr - zr)
        hl += hpc * (zl - hl)
        hr += hpc * (zr - hr)
        bl[p] = zl - hl
        br[p] = zr - hr
        p += 1
        if p >= d:
            p = 0
    return L, R


@nb.njit(cache=True, fastmath=True)
def k_comp_gain(det, thr, ratio, knee, att, rel):
    n = det.shape[0]
    g = np.empty(n)
    a = math.exp(-1.0 / (att * SR))
    r = math.exp(-1.0 / (rel * SR))
    env = 0.0
    slope = 1.0 - 1.0 / ratio
    for i in range(n):
        x = det[i]
        if x > env:
            env = a * env + (1.0 - a) * x
        else:
            env = r * env + (1.0 - r) * x
        lev = 20.0 * math.log10(env + 1e-9)
        over = lev - thr
        if over <= -knee * 0.5:
            gr = 0.0
        elif over >= knee * 0.5:
            gr = over * slope
        else:
            q = over + knee * 0.5
            gr = slope * q * q / (2.0 * knee)
        g[i] = 10.0 ** (-gr / 20.0)
    return g


@nb.njit(cache=True, fastmath=True)
def k_smooth_gain(target, att, rel):
    n = target.shape[0]
    g = np.empty(n)
    a = math.exp(-1.0 / (att * SR))
    r = math.exp(-1.0 / (rel * SR))
    v = 1.0
    for i in range(n):
        t = target[i]
        if t < v:
            v = a * v + (1.0 - a) * t
        else:
            v = r * v + (1.0 - r) * t
        g[i] = v
    return g


# ------------------------------------------------------------- buffers


def pan2(x, pan=0.0, gain=1.0):
    """Mono -> stereo with constant-power panning (pan -1..1)."""
    a = (pan + 1.0) * math.pi / 4.0
    return np.vstack((x * (math.cos(a) * math.sqrt(2.0) * gain), x * (math.sin(a) * math.sqrt(2.0) * gain)))


class Stem:
    def __init__(self, n):
        self.buf = np.zeros((2, n))

    @property
    def n(self):
        return self.buf.shape[1]

    def add(self, x, t, pan=0.0, gain=1.0):
        if x.ndim == 1:
            x = pan2(x, pan, gain)
        elif gain != 1.0:
            x = x * gain
        i0 = int(round(t * SR)) % self.n
        m = x.shape[1]
        pos = 0
        while pos < m:
            start = (i0 + pos) % self.n
            k = min(m - pos, self.n - start)
            self.buf[:, start : start + k] += x[:, pos : pos + k]
            pos += k


def circ(fn, x, warm):
    """Run a stateful effect as if the periodic buffer had always been looping."""
    n = x.shape[-1]
    warm = int(warm)
    reps = warm // n + 1
    pre = np.tile(x, reps)[..., -warm:] if warm > 0 else x[..., :0]
    y = fn(np.concatenate((pre, x), axis=-1))
    return y[..., warm : warm + n]


# ----------------------------------------------------------------- EQ


def _biquad(kind, f, q=0.707, gain_db=0.0):
    a = 10 ** (gain_db / 40)
    w0 = TAU * f / SR
    cw, sw = math.cos(w0), math.sin(w0)
    al = sw / (2 * q)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        aa = [1 + al, -2 * cw, 1 - al]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        aa = [1 + al, -2 * cw, 1 - al]
    elif kind == "bp":
        b = [al, 0, -al]
        aa = [1 + al, -2 * cw, 1 - al]
    elif kind == "peak":
        b = [1 + al * a, -2 * cw, 1 - al * a]
        aa = [1 + al / a, -2 * cw, 1 - al / a]
    elif kind == "lowshelf":
        sa = 2 * math.sqrt(a) * al
        b = [a * ((a + 1) - (a - 1) * cw + sa), 2 * a * ((a - 1) - (a + 1) * cw), a * ((a + 1) - (a - 1) * cw - sa)]
        aa = [(a + 1) + (a - 1) * cw + sa, -2 * ((a - 1) + (a + 1) * cw), (a + 1) + (a - 1) * cw - sa]
    elif kind == "highshelf":
        sa = 2 * math.sqrt(a) * al
        b = [a * ((a + 1) + (a - 1) * cw + sa), -2 * a * ((a - 1) + (a + 1) * cw), a * ((a + 1) + (a - 1) * cw - sa)]
        aa = [(a + 1) - (a - 1) * cw + sa, 2 * ((a - 1) - (a + 1) * cw), (a + 1) - (a - 1) * cw - sa]
    else:
        raise ValueError(kind)
    return np.array([[b[0] / aa[0], b[1] / aa[0], b[2] / aa[0], 1.0, aa[1] / aa[0], aa[2] / aa[0]]])


def eq(x, *bands, periodic=True):
    """bands: ("lp", f[, q]) / ("hp", f[, q]) / ("peak"|"lowshelf"|"highshelf", f, gain_db[, q])."""
    sos = []
    for b in bands:
        kind = b[0]
        if kind in ("lp", "hp", "bp"):
            sos.append(_biquad(kind, b[1], b[2] if len(b) > 2 else 0.707))
        else:
            sos.append(_biquad(kind, b[1], b[3] if len(b) > 3 else 0.707, b[2]))
    sos = np.vstack(sos)
    fn = lambda s: signal.sosfilt(sos, s, axis=-1)
    if periodic and x.shape[-1] > SR:
        return circ(fn, x, SR // 2)
    return fn(x)


# --------------------------------------------------------------- effects


def make_ir(t60, predelay=0.015, damping=0.5, size=1.0, seed=1, width=1.0):
    """Synthetic stereo room/hall impulse: early reflections + diffuse tail
    whose highs die faster than its lows."""
    rng = np.random.default_rng(seed)
    n = int((t60 * 1.15 + predelay) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    bands = [
        (("lp", 700.0), t60 * 1.15),
        (("bp", 2200.0, 0.5), t60 * (0.85 - 0.25 * damping)),
        (("hp", 5000.0), t60 * (0.6 - 0.4 * damping)),
    ]
    pd = int(predelay * SR)
    for ch in range(2):
        tail = np.zeros(n)
        for spec, bt60 in bands:
            noise = rng.standard_normal(n)
            noise = eq(noise[None, :], spec, periodic=False)[0]
            tail += noise * np.exp(-6.91 * t / max(bt60, 0.05))
        build = 1.0 - np.exp(-t / (0.012 * size + 0.004))
        tail *= build
        er = np.zeros(n)
        for k in range(10):
            ti = int((0.004 + rng.uniform(0, 0.055) * size) * SR)
            if ti < n:
                er[ti] += rng.choice([-1.0, 1.0]) * 0.9 * math.exp(-ti / SR / (0.05 * size + 0.02))
        sig = tail * 0.22 + er * 0.6
        shifted = np.zeros(n)
        shifted[pd:] = sig[: n - pd]
        out[ch] = shifted
    mid = (out[0] + out[1]) * 0.5
    side = (out[0] - out[1]) * 0.5 * width
    out = np.vstack((mid + side, mid - side))
    out /= math.sqrt(np.sum(out**2) / 2.0)
    return out * 0.35


def reverb(x, ir):
    def fn(s):
        return np.vstack([signal.oaconvolve(s[c], ir[c])[: s.shape[1]] for c in range(2)])

    return circ(fn, x, ir.shape[1])


def pingpong(x, delay_s, fb=0.45, tone=4500.0, low_cut=250.0):
    d = int(delay_s * SR)
    lpc = 1.0 - math.exp(-TAU * tone / SR)
    hpc = 1.0 - math.exp(-TAU * low_cut / SR)

    def fn(s):
        L, R = k_pingpong(s[0].copy(), s[1].copy(), d, fb, lpc, hpc)
        return np.vstack((L, R))

    warm = int(d * math.log(1e-4) / math.log(max(fb, 1e-3))) + d
    return circ(fn, x, min(warm, 12 * SR))


def chorus(x, rate=0.6, depth_ms=2.2, base_ms=9.0, mix=0.5, voices=2):
    n = x.shape[1]
    t = np.arange(n) / SR
    out = x * (1.0 - mix * 0.5)
    for c in range(2):
        for v in range(voices):
            ph = (c * 0.5 + v / voices) * TAU
            dl = (base_ms + depth_ms * np.sin(TAU * rate * (1 + 0.13 * v) * t + ph)) * SR / 1000.0
            out[c] += k_vdelay(x[c].copy(), dl) * (mix / voices)
    return out


def tape(x, wow=0.0016, wow_rate=0.45, flutter=0.00025, flutter_rate=6.3, seed=3):
    """Wow & flutter as a slowly modulated delay (pitch drift)."""
    n = x.shape[1]
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    drift = np.cumsum(rng.standard_normal(n)) / math.sqrt(SR) * 0.15
    drift = signal.sosfilt(signal.butter(1, 0.3, fs=SR, output="sos"), drift)
    # keep the drift periodic so the loop still closes
    drift -= np.linspace(drift[0], drift[-1], n)
    mod = wow * np.sin(TAU * wow_rate * t) + flutter * np.sin(TAU * flutter_rate * t) + wow * 0.5 * drift
    dl = (0.012 + mod) * SR
    return np.vstack([k_vdelay(x[c].copy(), dl) for c in range(2)])


def compress(x, thr=-18.0, ratio=2.5, att=0.01, rel=0.15, knee=6.0, makeup=0.0, key=None):
    det = np.max(np.abs(x if key is None else key), axis=0)

    def fn(s):
        return k_comp_gain(s[0], thr, ratio, knee, att, rel)[None, :]

    g = circ(fn, det[None, :], SR)[0]
    return x * g * dbg(makeup)


def sidechain(x, times, depth=0.6, attack=0.004, release=0.22, total=None, curve=2.0):
    """Ducking envelope triggered at `times` (seconds), wrapped periodically."""
    n = x.shape[1]
    env = np.ones(n)
    rl = int(release * SR * 1.6)
    k = np.arange(rl) / SR
    shape = 1.0 - depth * np.exp(-((k / release) ** curve) * 3.0)
    att_n = int(attack * SR)
    if att_n > 0:
        shape[:att_n] = np.minimum(shape[:att_n], 1.0 - depth * (np.arange(att_n) / att_n))
    for t0 in times:
        i0 = int(round(t0 * SR)) % n
        idx = (i0 + np.arange(rl)) % n
        env[idx] = np.minimum(env[idx], shape)
    return x * env


def loop_rate(rate, n):
    """Nudge an LFO rate to a whole number of cycles over the loop."""
    secs = n / SR
    return max(1, round(rate * secs)) / secs


def autopan(x, rate=4.0, depth=0.35):
    """Stereo tremolo (Rhodes-style), opposite phase per side."""
    n = x.shape[1]
    t = np.arange(n) / SR
    lfo = np.sin(TAU * loop_rate(rate, n) * t)
    return np.vstack((x[0] * (1 - depth * 0.5 * (1 + lfo)), x[1] * (1 - depth * 0.5 * (1 - lfo)))) / (1 - depth * 0.5)


def saturate(x, drive=1.5):
    return np.tanh(x * drive) / math.tanh(drive)


def widen(x, amount=1.3):
    mid = (x[0] + x[1]) * 0.5
    side = (x[0] - x[1]) * 0.5 * amount
    return np.vstack((mid + side, mid - side))


def haas(x_mono, ms=12.0, pan=0.0):
    d = int(ms * SR / 1000)
    r = np.concatenate((np.zeros(d), x_mono))[: x_mono.shape[0]]
    return np.vstack((x_mono, r)) if pan <= 0 else np.vstack((r, x_mono))


# --------------------------------------------------------------- master


def loudness(x):
    """Approximate BS.1770 integrated loudness (LUFS)."""
    k = eq(x, ("highshelf", 1681.0, 4.0, 0.707), ("hp", 38.0, 0.5), periodic=False)
    blk = int(0.4 * SR)
    hop = int(0.1 * SR)
    ms = []
    for i in range(0, k.shape[1] - blk, hop):
        ms.append(np.mean(k[:, i : i + blk] ** 2, axis=1).sum())
    ms = np.array(ms)
    lk = -0.691 + 10 * np.log10(ms + 1e-12)
    ms = ms[lk > -70]
    rel = -0.691 + 10 * np.log10(np.mean(ms) + 1e-12) - 10
    ms = ms[(-0.691 + 10 * np.log10(ms + 1e-12)) > rel]
    return -0.691 + 10 * np.log10(np.mean(ms) + 1e-12)


def limit(x, ceiling_db=-1.0, lookahead=0.005, release=0.12):
    ceil = dbg(ceiling_db)
    la = int(lookahead * SR)

    # A centred min-filter starts pulling the gain down `la` samples before
    # each peak, so no signal delay is needed for the lookahead.
    def fn(s):
        peak = np.max(np.abs(s), axis=0)
        req = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
        req = minimum_filter1d(req, size=2 * la + 1)
        g = k_smooth_gain(req, lookahead / 4.0, release)
        return s * g

    y = circ(fn, x, SR)
    return np.clip(y, -ceil, ceil)


def master(x, target_lufs=-16.0, glue=True, ceiling=-1.0):
    x = eq(x, ("hp", 28.0, 0.6))
    if glue:
        x = compress(x, thr=-20.0, ratio=1.8, att=0.025, rel=0.25, knee=8.0)
    for _ in range(3):
        x = x * dbg(target_lufs - loudness(x))
        y = limit(x, ceiling)
        if os.environ.get("MIXDEBUG"):
            print(f"  master: pre-limit peak {20 * np.log10(np.max(np.abs(x))):+.1f} dBFS")
        if abs(loudness(y) - target_lufs) < 0.3:
            return y
        x = y
    return y
