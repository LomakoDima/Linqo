"""Ambient: beatless — slow-blooming detuned pads, a sub drone, a glassy
octave layer, sparse bell shimmer through long delays, wind, and a very
long hall."""

import numpy as np

import instruments as I
from common import chord_at, chord_tone, phrase_chords, place_melody
from engine import eq, make_ir
from song import Song
from theory import melody, note_pc, scale_notes, voice

RHYTHMS = [[(0.0, 3.0), (3.0, 1.0)], [(0.0, 2.0), (2.0, 2.0)], [(1.0, 3.0)]]
CADENCE = [(0.0, 4.0)]

TRACKS = [
    dict(
        slug="aurora-drift",
        title="Aurora Drift",
        bpm=60,
        key="E",
        mode="major",
        pent="pent",
        prog=["Emaj9", "Emaj9", "C#m11", "C#m11", "Amaj7#11", "Amaj7#11", "B9sus4", "B9sus4"],
        lead=False,
        seed=501,
    ),
    dict(
        slug="deep-field",
        title="Deep Field",
        bpm=56,
        key="D",
        mode="minor",
        pent="mpent",
        prog=["Dm9", "Dm9", "Bbmaj7#11", "Bbmaj7#11", "Gm9", "Gm9", "Asus4", "Asus4"],
        lead=False,
        seed=513,
    ),
    dict(
        slug="glass-horizon",
        title="Glass Horizon",
        bpm=60,
        key="F",
        mode="lydian",
        pent="pent",
        prog=["Fmaj7#11", "Fmaj7#11", "G6", "G6", "Em7", "Em7", "Am9", "Am9"],
        lead=True,
        seed=527,
    ),
]


def build(cfg):
    bars = 20
    s = Song(cfg["bpm"], bars, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bl = s.g.bar_len

    prev = None
    for bar in range(0, bars, 2):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, prev, 50, 72, max_notes=5)
        prev = notes
        for m in notes:
            s.play("pad", I.pad(m, bl * 2, 0.5, cutoff=750, a=2.8, r=4.0, detune=18, voices=7, lfo_cut=0.5, seed=bar), s.t(bar, 0, human=False))
            if bar % 4 == 0 or bar >= 8:
                s.play("glass", I.pad(m + 12, bl * 2, 0.3, cutoff=2600, a=3.5, r=4.0, shape=2, voices=3, detune=6, seed=bar + 1), s.t(bar, 0, human=False))
        root = chord_tone(sym, "root", 31)
        s.play("drone", I.subbass(root, bl * 2 - 0.5, 0.55, harm=0.08, drive=1.0, r=3.0), s.t(bar, 0, human=False))
        s.play("drone", I.strings(root + 12, bl * 2, 0.45, a=2.5, r=3.0, cutoff=500), s.t(bar, 0, human=False))

    shimmer = scale_notes(key, cfg["pent"], 76, 96)
    for bar in range(4, 18):
        for _ in range(int(rng.integers(1, 4))):
            beat = float(rng.choice([0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]))
            m = int(rng.choice(shimmer))
            s.play("shimmer", I.bell(m, 4.0, float(rng.uniform(0.25, 0.45)), ratio=float(rng.choice([2.0, 3.0, 4.0])), index=0.8, tau=3.0), s.t(bar, beat), pan=float(rng.uniform(-0.8, 0.8)))

    if cfg["lead"]:
        for bar0, which, final in ((8, 0, False), (12, 0, True)):
            notes = melody(np.random.default_rng(cfg["seed"] + which), phrase_chords(prog, bar0, 4), key, cfg["mode"], 64, 81, RHYTHMS, CADENCE, final=final)
            for b, beat, dur, m, v in notes:
                x = I.synth(m, s.g.beats(dur), v * 0.8, shape=2, voices=2, detune=5, cutoff=1800, a=0.5, d=1.0, s=0.8, r=1.5, vib=0.003, vib_rate=4.5, vib_delay=0.6, stereo=True)
                s.play("lead", x, s.t(bar0 + b, beat))

    s.stem("air").buf += I.wind(s.n, cfg["seed"], level=1.2, center=500.0)

    hall = make_ir(7.0, predelay=0.05, damping=0.6, size=2.0, seed=cfg["seed"], width=1.2)
    spec = {
        "pad": dict(db=-3.0, eq=[("hp", 120.0)], rev={"hall": 0.5}, width=1.4),
        "glass": dict(db=-9.0, eq=[("hp", 400.0), ("lp", 7000.0)], rev={"hall": 0.6}, width=1.5),
        "drone": dict(db=-9.0, eq=[("hp", 28.0), ("lp", 700.0)], rev={"hall": 0.15}),
        "shimmer": dict(db=-6.0, eq=[("hp", 700.0)], rev={"hall": 0.9}, dly=0.6),
        "lead": dict(db=-3.0, eq=[("hp", 250.0)], rev={"hall": 0.6}, dly=0.3),
        "air": dict(db=0.0, eq=[("hp", 150.0)], width=1.6),
    }
    return s.mix(
        spec,
        irs={"hall": hall},
        delay=dict(time=s.g.beats(1.5), fb=0.55, tone=2800.0, to_rev=0.8),
        target=-18.0,
        glue=False,
    )
