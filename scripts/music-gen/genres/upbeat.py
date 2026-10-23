"""Upbeat: tropical/pop house — four-on-the-floor, claps, offbeat open
hats, 3-3-2 chord stabs, a pumping offbeat bass, a build with a snare
roll and filter rise, and a catchy hook over the drop."""

import numpy as np

import instruments as I
from common import chord_at, chord_tone, phrase_chords
from engine import SR, chorus, k_svf, make_ir, saturate
from song import Song
from theory import melody, note_pc, voice

RHYTHMS = [
    [(0.0, 0.5), (0.5, 0.25), (0.75, 0.75), (1.5, 0.5), (2.0, 0.5), (2.5, 1.0)],
    [(0.0, 0.75), (0.75, 0.75), (1.5, 0.5), (2.5, 0.5), (3.0, 1.0)],
    [(0.5, 0.5), (1.0, 0.5), (1.5, 0.5), (2.0, 1.0), (3.0, 0.5), (3.5, 0.5)],
    [(0.0, 0.25), (0.25, 0.25), (0.5, 0.5), (1.0, 1.0), (2.0, 0.75), (2.75, 1.25)],
]
CADENCE = [(0.0, 0.5), (0.5, 0.5), (1.0, 2.0)]

TRACKS = [
    dict(slug="good-vibes", title="Good Vibes", bpm=122, key="C", prog=["Cadd9", "G", "Am7", "Fmaj7"], lead="marimba", seed=901),
    dict(slug="summer-rush", title="Summer Rush", bpm=124, key="F", prog=["Fmaj7", "C", "Dm7", "Bbmaj7"], lead="pluck", seed=913),
    dict(slug="bright-side", title="Bright Side", bpm=118, key="A", prog=["Dmaj7", "E", "C#m7", "F#m7"], lead="piano", seed=927),
]

STABS = [0.0, 0.75, 1.5, 2.25, 3.0]
BASS = [(0.5, 0.35, 0), (1.25, 0.2, 12), (1.5, 0.35, 0), (2.5, 0.35, 0), (3.25, 0.2, 12), (3.5, 0.35, 7)]

SECTIONS = {
    "intro": range(0, 4),
    "verse": range(4, 12),
    "build": range(12, 16),
    "drop": range(16, 24),
    "break": range(24, 28),
    "drop2": range(28, 36),
    "outro": range(36, 40),
}


def section(bar):
    return next(k for k, r in SECTIONS.items() if bar in r)


def build(cfg):
    bars = 40
    s = Song(cfg["bpm"], bars, seed=cfg["seed"])
    s.h.ms = 2.5
    s.h.v = 0.05
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bl = s.g.bar_len

    prev = None
    for bar in range(bars):
        sec = section(bar)
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, prev, 57, 76, max_notes=4)
        prev = notes
        stem = "stabs_f" if sec in ("intro", "outro") or (sec == "build" and bar < 14) else "stabs"
        for sb in STABS:
            for m in notes:
                s.play(stem, I.piano(m, s.g.beats(0.4), s.h.vel(0.55 if sb == 0 else 0.48), bright=1.0), s.t(bar, sb), pan=float(np.clip((m - 66) / 14, -0.5, 0.5)))
                if sec in ("drop", "drop2"):
                    s.play("pluck", I.marimba(m + 12, 0.3, s.h.vel(0.4)), s.t(bar, sb), pan=float(np.clip((66 - m) / 14, -0.5, 0.5)))
        if sec in ("drop", "drop2", "break"):
            for m in notes:
                s.play("pad", I.pad(m, bl, 0.4, cutoff=2400, a=0.2, r=0.6, voices=6), s.t(bar, 0, human=False))
        elif sec in ("intro", "outro", "build"):
            for m in notes:
                s.play("pad", I.pad(m, bl, 0.35, cutoff=900 + 250 * (bar % 4), a=0.4, r=0.8, voices=6), s.t(bar, 0, human=False))

        # bass
        if sec in ("verse", "build", "drop", "drop2", "outro"):
            root = chord_tone(sym, "root", 33)
            for bb, bd, off in BASS:
                m = root + off
                x = I.synth(m, s.g.beats(bd), 0.85, shape=0, voices=2, detune=5, cutoff=260, env_amt=1600, env_tau=0.07, res=0.3, a=0.002, d=0.15, s=0.5, r=0.05, sub=0.6, key_track=0.0)
                s.play("bass", x, s.t(bar, bb))

        # drums
        kick_on = sec in ("verse", "drop", "drop2", "outro") or (sec == "build" and bar < 15)
        if kick_on:
            for kb in range(4):
                s.kick("kick", I.kick("house", kb % 3), s.t(bar, kb), gain=0.9)
        if sec != "intro":
            for cb in (1.0, 3.0):
                s.play("clap", I.clap(int(rng.integers(3))), s.t(bar, cb), pan=0.05, gain=s.h.vel(0.8))
                if sec in ("drop", "drop2"):
                    s.play("snare", I.snare("tight", 0), s.t(bar, cb), gain=0.45)
        for ob in (0.5, 1.5, 2.5, 3.5):
            s.play("hats", I.hat(sec not in ("intro", "break"), int(rng.integers(3))), s.t(bar, ob), pan=0.2, gain=s.h.vel(0.35))
        if sec not in ("intro",):
            for i in range(16):
                s.play("shaker", I.shaker(i % 3, 0.035), s.t(bar, i * 0.25), pan=-0.35, gain=s.h.vel((0.35, 0.18, 0.26, 0.18)[i % 4]))
        if sec == "build":
            k = bar - 12
            n = (4, 4, 8, 16)[k]
            for i in range(n):
                s.play("snare", I.snare("tight", i % 3), s.t(bar, i * 4.0 / n), gain=0.25 + 0.12 * k + 0.02 * i)
        if bar in (16, 28):
            s.play("crash", I.crash(bar % 2), s.t(bar, 0), pan=0.3, gain=0.9)

    # riser noise over the build
    t0 = s.t(12, 0, human=False)
    n = int(bl * 4 * SR)
    tt = np.arange(n) / n
    noise = rng.standard_normal(n)
    riser = k_svf(noise, 300 * 2 ** (tt * 5.5), 0.6, 1) * tt**2 * 0.35
    s.play("riser", riser, t0)

    # hook
    for bar0, which, final in ((16, 0, False), (20, 0, True), (24, 1, False), (28, 0, False), (32, 0, True)):
        notes = melody(np.random.default_rng(cfg["seed"] + which * 23), phrase_chords(prog, bar0, 4), key, "major", 67, 86, RHYTHMS, CADENCE, final=final)
        for b, beat, dur, m, v in notes:
            if cfg["lead"] == "marimba":
                x = I.marimba(m, s.g.beats(dur), v)
            elif cfg["lead"] == "pluck":
                x = I.synth(m, s.g.beats(dur) * 0.9, v, shape=0, voices=3, detune=10, cutoff=1500, env_amt=4000, env_tau=0.09, res=0.25, a=0.002, d=0.25, s=0.3, r=0.15, stereo=True, seed=b)
            else:
                x = I.piano(m, s.g.beats(dur), v, bright=1.0)
            s.play("lead", x, s.t(bar0 + b, beat))

    room = make_ir(1.0, predelay=0.01, damping=0.5, size=0.5, seed=cfg["seed"])
    hall = make_ir(2.2, predelay=0.025, damping=0.45, size=1.1, seed=cfg["seed"] + 1)
    spec = {
        "stabs": dict(db=-4.0, eq=[("hp", 180.0), ("peak", 3500.0, 2.0, 0.8)], rev={"room": 0.15, "hall": 0.1}, sc=0.4, width=1.6),
        "stabs_f": dict(db=-3.0, eq=[("hp", 180.0), ("lp", 1400.0)], rev={"hall": 0.3}, sc=0.3, width=1.6),
        "pluck": dict(db=-8.0, eq=[("hp", 400.0)], rev={"hall": 0.2}, dly=0.15, sc=0.4),
        "pad": dict(db=-1.0, eq=[("hp", 250.0)], fx=[lambda x: chorus(x, 0.5, 2.5, mix=0.4)], rev={"hall": 0.3}, sc=0.55, width=1.4),
        "bass": dict(db=-4.0, eq=[("hp", 35.0), ("lp", 3000.0)], fx=[lambda x: saturate(x, 1.3)], sc=0.6),
        "kick": dict(db=-10.0, eq=[("hp", 32.0)]),
        "clap": dict(db=5.0, eq=[("hp", 300.0)], rev={"room": 0.25, "hall": 0.1}),
        "snare": dict(db=-4.0, eq=[("hp", 200.0)], rev={"room": 0.2}),
        "hats": dict(db=6.0, eq=[("hp", 5000.0)], rev={"room": 0.1}),
        "shaker": dict(db=9.0, rev={"room": 0.1}),
        "crash": dict(db=-6.0, rev={"hall": 0.2}),
        "riser": dict(db=-8.0, rev={"hall": 0.3}, width=1.5),
        "lead": dict(db=2.0, eq=[("hp", 250.0)], rev={"hall": 0.25}, dly=0.25),
    }
    return s.mix(
        spec,
        irs={"room": room, "hall": hall},
        delay=dict(time=s.g.beats(0.75), fb=0.35, tone=4500.0, to_rev=0.2),
        master_fx=[lambda x: saturate(x * 1.1, 1.15) / 1.1],
        target=-14.5,
    )
