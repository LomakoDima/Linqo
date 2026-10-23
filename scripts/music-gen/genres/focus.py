"""Focus: steady, minimal and non-intrusive — a soft four-on-the-floor,
a 16th-note pluck arpeggio whose filter slowly breathes over the whole
loop, rolling offbeat bass, a pad, and a sparse bell motif. No lead
melody to pull attention."""

import math

import numpy as np

import instruments as I
from common import chord_at, chord_tone
from engine import eq, make_ir
from song import Song
from theory import note_pc, voice

TRACKS = [
    dict(
        slug="deep-work",
        title="Deep Work",
        bpm=100,
        key="A",
        prog=["Am9", "Am9", "Fmaj9", "Fmaj9", "Cmaj9", "Cmaj9", "G6", "G6"],
        arp=[0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 4, 3, 2, 1],
        seed=301,
    ),
    dict(
        slug="flow-state",
        title="Flow State",
        bpm=104,
        key="F#",
        prog=["F#m9", "F#m9", "Dmaj9", "Dmaj9", "Amaj9", "Amaj9", "Esus4", "E6"],
        arp=[0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3],
        seed=313,
    ),
    dict(
        slug="quiet-mind",
        title="Quiet Mind",
        bpm=96,
        key="E",
        prog=["Em9", "Cmaj9", "G6", "Dsus2", "Em9", "Cmaj9", "Am9", "Dsus2"],
        arp=[0, 3, 1, 2, 0, 3, 1, 2, 4, 3, 1, 2, 4, 3, 2, 1],
        seed=327,
    ),
]


def build(cfg):
    bars = 32
    s = Song(cfg["bpm"], bars, seed=cfg["seed"])
    s.h.ms = 3.0
    s.h.v = 0.04
    prog = cfg["prog"]
    rng = np.random.default_rng(cfg["seed"])
    bl = s.g.bar_len

    def opening(bar):
        # filter "breath" over the loop: closed at the loop point, open mid-way
        return 0.5 - 0.5 * math.cos(2 * math.pi * bar / bars)

    # --- pad
    prev = None
    for bar in range(0, bars, 2):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, prev, 52, 72, max_notes=4)
        prev = notes
        for m in notes:
            s.play("pad", I.pad(m, bl * 2, 0.45, cutoff=900 + 700 * opening(bar), a=1.5, r=2.0, voices=5), s.t(bar, 0, human=False))

    # --- arp
    for bar in range(bars):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, None, 57, 79, max_notes=4)
        notes = notes + [notes[0] + 12]
        cut = 500 + 2300 * opening(bar)
        for i in range(16):
            m = notes[cfg["arp"][i] % len(notes)]
            v = 0.55 if i % 4 == 0 else 0.42
            x = I.synth(m, s.g.beats(0.22), v, shape=0, voices=2, detune=7, cutoff=cut, env_amt=1200 + 1500 * opening(bar), env_tau=0.07, res=0.35, a=0.002, d=0.12, s=0.0, r=0.1, stereo=True, seed=i)
            s.play("arp", x, s.t(bar, i * 0.25))

    # --- bass: rolling offbeat 8ths
    for bar in range(4, bars):
        sym = chord_at(prog, bar, 0)
        root = chord_tone(sym, "root", 33)
        for beat in (0.5, 1.5, 2.5, 3.5):
            x = I.synth(root, s.g.beats(0.32), 0.85, shape=0, cutoff=180, env_amt=700, env_tau=0.05, res=0.2, a=0.003, d=0.2, s=0.5, r=0.06, sub=0.7, key_track=0.0)
            s.play("bass", x, s.t(bar, beat))

    # --- drums
    for bar in range(bars):
        brk = 24 <= bar < 28
        if bar >= 2 and not brk:
            for beat in range(4):
                s.kick("kick", I.kick("soft", beat % 3), s.t(bar, beat), gain=0.8 if bar >= 4 else 0.55)
        if bar >= 8:
            for beat in (0.5, 1.5, 2.5, 3.5):
                s.play("hats", I.hat(False, int(rng.integers(3))), s.t(bar, beat), pan=0.25, gain=s.h.vel(0.4))
            for i in range(16):
                if i % 4 != 2:
                    s.play("shaker", I.shaker(i % 3, 0.03), s.t(bar, i * 0.25), pan=-0.3, gain=s.h.vel(0.18 if i % 2 else 0.25))
        if 12 <= bar < 24 or bar >= 28:
            for beat in (1.0, 3.0):
                s.play("clap", I.rim(beat == 3.0), s.t(bar, beat), pan=0.1, gain=0.45)

    # --- bell motif every 4 bars in the middle
    for bar in range(12, 24, 4):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, None, 76, 93, max_notes=4)
        for j, beat in enumerate((0.0, 0.75, 1.5)):
            s.play("bells", I.bell(notes[(j * 2) % len(notes)], 2.0, 0.45, ratio=4.0, index=0.9, tau=1.4), s.t(bar, beat), pan=-0.3 + 0.3 * j)

    room = make_ir(0.9, predelay=0.008, damping=0.5, size=0.5, seed=cfg["seed"])
    hall = make_ir(3.2, predelay=0.03, damping=0.5, size=1.3, seed=cfg["seed"] + 1)
    spec = {
        "pad": dict(db=-4.0, eq=[("hp", 180.0)], rev={"hall": 0.35}, sc=0.3, width=1.3),
        "arp": dict(db=2.0, eq=[("hp", 250.0)], rev={"hall": 0.18}, dly=0.3, sc=0.2),
        "bass": dict(db=-3.0, eq=[("hp", 35.0), ("lp", 1000.0)], sc=0.15),
        "kick": dict(db=-11.0, eq=[("hp", 38.0), ("lp", 6000.0)]),
        "hats": dict(db=9.0, eq=[("lp", 11000.0)], rev={"room": 0.15}),
        "shaker": dict(db=6.0, rev={"room": 0.15}),
        "clap": dict(db=8.0, eq=[("hp", 300.0)], rev={"room": 0.3, "hall": 0.1}),
        "bells": dict(db=0.0, eq=[("hp", 500.0)], rev={"hall": 0.5}, dly=0.35),
    }
    return s.mix(
        spec,
        irs={"room": room, "hall": hall},
        delay=dict(time=s.g.beats(0.75), fb=0.42, tone=3200.0, to_rev=0.3),
        master_fx=[lambda x: eq(x, ("highshelf", 10000.0, -1.0))],
        target=-16.5,
    )
