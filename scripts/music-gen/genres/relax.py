"""Relax: no drums — warm strings, a pedalled piano arpeggio, a slow
singing lead, the occasional bell, wind, and a big soft hall."""

import numpy as np

import instruments as I
from common import chord_at, chord_tone, phrase_chords, place_melody
from engine import eq, make_ir
from song import Song
from theory import melody, note_pc, voice

RHYTHMS = [
    [(0.0, 1.5), (1.5, 0.5), (2.0, 2.0)],
    [(0.0, 2.0), (2.0, 1.0), (3.0, 1.0)],
    [(0.5, 1.0), (1.5, 0.5), (2.0, 2.0)],
    [(0.0, 3.0), (3.0, 1.0)],
]
CADENCE = [(0.0, 4.0)]

TRACKS = [
    dict(
        slug="still-water",
        title="Still Water",
        bpm=64,
        key="C",
        mode="major",
        prog=["Cmaj9", "Cmaj9", "Am9", "Am9", "Fmaj9", "Fmaj9", "Dm9", "G9sus4"],
        lead="piano",
        seed=201,
    ),
    dict(
        slug="soft-morning",
        title="Soft Morning",
        bpm=66,
        key="D",
        mode="major",
        prog=["Dmaj9", "Dmaj9", "Bm11", "Bm11", "Gmaj9", "Gmaj9", "Em9", "A9sus4"],
        lead="flute",
        seed=213,
    ),
    dict(
        slug="breathe-in",
        title="Breathe In",
        bpm=62,
        key="Eb",
        mode="major",
        prog=["Ebmaj9", "Ebmaj9", "Cm9", "Cm9", "Abmaj9", "Abmaj9", "Fm9", "Bb9sus4"],
        lead="harp",
        seed=227,
    ),
]

ARP = [0, 1, 2, 3, 4, 3, 2, 1]


def build(cfg):
    bars = 20
    s = Song(cfg["bpm"], bars, seed=cfg["seed"])
    s.h.ms = 10.0
    key = note_pc(cfg["key"])
    prog = cfg["prog"]
    bl = s.g.bar_len

    # --- strings: one sustained voicing per chord, long swells
    prev = None
    bar = 0
    while bar < bars:
        sym = chord_at(prog, bar, 0)
        span = 1
        while bar + span < bars and chord_at(prog, bar + span, 0) == sym:
            span += 1
        notes = voice(sym, prev, 52, 72, max_notes=4)
        prev = notes
        for m in notes:
            s.play("strings", I.strings(m, bl * span, 0.5, a=1.4, r=2.2, cutoff=2000), s.t(bar, 0, human=False))
        low = chord_tone(sym, "root", 36)
        s.play("cello", I.strings(low, bl * span, 0.55, a=1.0, r=2.0, cutoff=900), s.t(bar, 0, human=False))
        bar += span

    # --- pedalled piano arpeggio (8ths), resting on the last bar of each 8
    for bar in range(bars):
        sym = chord_at(prog, bar, 0)
        stack = [chord_tone(sym, "root", 43)] + voice(sym, None, 55, 72, max_notes=4)
        steps = 8 if bar % 8 != 7 else 4
        for i in range(steps):
            m = stack[ARP[i] % len(stack)]
            ring = bl - i * 0.5 * s.g.spb + 0.3
            v = (0.42 if i == 0 else 0.3) * (0.75 if bar < 4 else 1.0)
            s.play("arp", I.piano(m, ring, s.h.vel(v), bright=0.55, seed=i), s.t(bar, i * 0.5), pan=-0.15 + 0.05 * (m - 60) / 6)

    # --- lead
    lead = cfg["lead"]
    lo, hi = (69, 86) if lead != "piano" else (67, 84)
    for bar0, which, final in ((4, 0, False), (8, 0, True), (12, 1, False), (16, 1, True)):
        notes = melody(np.random.default_rng(cfg["seed"] * 3 + which), phrase_chords(prog, bar0, 4), key, cfg["mode"], lo, hi, RHYTHMS, CADENCE, final=final)
        if lead == "piano":
            place_melody(s, "lead", notes, bar0, I.piano, gain=1.1, bright=0.7)
        elif lead == "flute":
            place_melody(s, "lead", notes, bar0, I.flute, gain=0.55, legato=0.97)
        else:
            place_melody(s, "lead", notes, bar0, I.guitar, gain=1.6, bright=0.75, t60=4.0)

    # --- bells: a few high chord tones drifting in the B section
    rng = np.random.default_rng(cfg["seed"])
    for bar in range(12, 20, 2):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, None, 79, 96, max_notes=4)
        for j in range(2):
            m = int(rng.choice(notes))
            s.play("bells", I.bell(m, 3.0, 0.4, ratio=3.0, index=1.0, tau=2.6), s.t(bar, 1.0 + j * 2.5), pan=float(rng.uniform(-0.6, 0.6)))

    s.stem("air").buf += I.wind(s.n, cfg["seed"], level=1.0, center=900.0)

    hall = make_ir(4.2, predelay=0.04, damping=0.55, size=1.6, seed=cfg["seed"])
    spec = {
        "strings": dict(db=-6.0, eq=[("hp", 150.0), ("lp", 7500.0)], rev={"hall": 0.45}, width=1.3),
        "cello": dict(db=-1.0, eq=[("hp", 45.0), ("lp", 1500.0)], rev={"hall": 0.25}),
        "arp": dict(db=-1.0, eq=[("hp", 80.0), ("peak", 300.0, -2.0, 1.0)], rev={"hall": 0.4}),
        "lead": dict(db=1.0, eq=[("hp", 200.0)], rev={"hall": 0.5}, dly=0.18),
        "bells": dict(db=-6.0, eq=[("hp", 600.0)], rev={"hall": 0.7}, dly=0.4),
        "air": dict(db=-2.0, eq=[("hp", 200.0)], width=1.5),
    }
    return s.mix(
        spec,
        irs={"hall": hall},
        delay=dict(time=s.g.beats(1.5), fb=0.35, tone=3000.0, to_rev=0.6),
        master_fx=[lambda x: eq(x, ("highshelf", 6000.0, 1.5))],
        target=-17.5,
        glue=False,
    )
