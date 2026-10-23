"""Song scaffold: a periodic multitrack with sends, a mixdown and export."""

import os
import struct
import wave
import zlib

import lameenc
import numpy as np

from engine import SR, Stem, chorus, compress, dbg, eq, make_ir, master, pingpong, reverb, sidechain
from theory import Grid, Human


class Song:
    def __init__(self, bpm, bars, bpb=4, swing=0.0, swing_unit=0.5, seed=0):
        self.g = Grid(bpm, bars, bpb, swing, swing_unit)
        self.n = int(round(self.g.length * SR))
        self.stems = {}
        self.h = Human(seed)
        self.rng = np.random.default_rng(seed + 1000)
        self.kicks = []

    def t(self, bar, beat=0.0, human=True):
        t = self.g.t(bar, beat)
        return self.h.t(t) if human else t

    def stem(self, name):
        if name not in self.stems:
            self.stems[name] = Stem(self.n)
        return self.stems[name]

    def play(self, name, x, t, pan=0.0, gain=1.0):
        self.stem(name).add(x, t, pan, gain)

    def kick(self, name, x, t, gain=1.0):
        self.kicks.append(t)
        self.play(name, x, t, 0.0, gain)

    def mix(self, spec, irs=None, delay=None, master_fx=(), target=-16.0, glue=True):
        """spec: {stem: dict(db=0, eq=[...], fx=[fn], sc=depth, rev={bus: amt}, dly=amt, width=1)}
        irs: {bus: ir array}; delay: dict(time=s, fb=0.4, tone=4000)."""
        irs = irs or {}
        dry = np.zeros((2, self.n))
        sends = {k: np.zeros((2, self.n)) for k in irs}
        dly_bus = np.zeros((2, self.n))
        for name, st in self.stems.items():
            p = spec.get(name, {})
            x = st.buf
            if p.get("eq"):
                x = eq(x, *p["eq"])
            for fn in p.get("fx", ()):
                x = fn(x)
            if p.get("sc"):
                x = sidechain(x, self.kicks, depth=p["sc"], release=p.get("sc_rel", 0.6 * self.g.spb))
            if p.get("width", 1.0) != 1.0:
                mid = (x[0] + x[1]) * 0.5
                side = (x[0] - x[1]) * 0.5 * p["width"]
                x = np.vstack((mid + side, mid - side))
            x = x * dbg(p.get("db", 0.0))
            if os.environ.get("MIXDEBUG"):
                print(f"  {name:12s} {20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-9):6.1f} dB rms")
            dry += x
            for bus, amt in p.get("rev", {}).items():
                sends[bus] += x * amt
            if p.get("dly"):
                dly_bus += x * p["dly"]
        out = dry
        if delay and np.any(dly_bus):
            wet = pingpong(dly_bus, delay["time"], delay.get("fb", 0.4), delay.get("tone", 4000.0))
            out = out + wet
            first = next(iter(sends), None)
            if first:
                sends[first] += wet * delay.get("to_rev", 0.4)
        for bus, ir in irs.items():
            wet = reverb(sends[bus], ir)
            out = out + eq(wet, ("hp", 180.0), ("lp", 11000.0))
        for fn in master_fx:
            out = fn(out)
        return master(out, target, glue)


# ----------------------------------------------------------------- export


def to_int16(x, seed=7):
    rng = np.random.default_rng(seed)
    tpdf = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0
    return np.clip(np.round((x + tpdf) * 32767.0), -32768, 32767).astype(np.int16)


def write_mp3(path, x, kbps=128):
    pcm = to_int16(x).T.copy()
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    with open(path, "wb") as f:
        f.write(data)


def write_wav(path, x):
    pcm = to_int16(x).T.copy()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def spectrogram_png(path, x, width=1400, height=420):
    """Log-frequency spectrogram (30 Hz - 16 kHz) with a waveform strip —
    for eyeballing a mix's balance without listening to it."""
    mono = x.mean(axis=0)
    nfft = 4096
    hop = max(1, (mono.shape[0] - nfft) // width)
    win = np.hanning(nfft)
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    rows = np.geomspace(30, 16000, height)
    idx = np.clip(np.searchsorted(freqs, rows), 0, len(freqs) - 1)
    img = np.zeros((height, width))
    for c in range(width):
        seg = mono[c * hop : c * hop + nfft]
        if seg.shape[0] < nfft:
            break
        spec = np.abs(np.fft.rfft(seg * win))
        img[:, c] = 20 * np.log10(spec[idx] + 1e-9)
    img = img[::-1]
    img = np.clip((img - (img.max() - 90)) / 90, 0, 1)
    wave_h = 80
    wv = np.zeros((wave_h, width))
    pk = np.abs(mono[: hop * width].reshape(width, -1)).max(axis=1)
    for c in range(width):
        h = int(pk[c] * (wave_h // 2))
        wv[wave_h // 2 - h : wave_h // 2 + h + 1, c] = 1
    full = np.vstack((wv, np.full((4, width), 0.3), img))
    r = np.clip(full * 3.0 - 1.0, 0, 1)
    g = np.clip(full * 3.0 - 2.0, 0, 1) * 0.9 + np.clip(full * 1.5 - 0.5, 0, 0.3)
    b = np.clip(full * 2.0, 0, 1) * (1 - np.clip(full * 3 - 2, 0, 1) * 0.5)
    rgb = (np.stack((r, g, b), axis=-1) * 255).astype(np.uint8)
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[i].tobytes() for i in range(h))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


__all__ = ["Song", "write_mp3", "write_wav", "spectrogram_png", "make_ir", "chorus", "compress"]
