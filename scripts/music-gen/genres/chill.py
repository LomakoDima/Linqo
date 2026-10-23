"""Chillhop: brighter and bouncier than lo-fi — clean chorused guitar
arpeggios, keys, a singing lead, shaker-driven light swing."""

import numpy as np

import instruments as I
from common import bar_chords, chord_at, chord_tone, phrase_chords, place_melody, strum
from engine import autopan, chorus, eq, make_ir, saturate
from song import Song
from theory import melody, nearest, note_pc, parse, voice

RHYTHMS = [
    [(0.0, 0.5), (0.5, 0.5), (1.0, 1.0), (2.5, 0.5), (3.0, 1.0)],
    [(0.0, 1.0), (1.5, 0.5), (2.0, 0.75), (2.75, 1.25)],
    [(0.5, 0.5), (1.0, 0.5), (1.5, 1.0), (3.0, 0.5), (3.5, 0.5)],
    [(0.0, 0.75), (0.75, 0.75), (1.5, 0.5), (2.0, 2.0)],
]
CADENCE = [(0.0, 0.5), (0.5, 0.5), (1.0, 3.0)]

TRACKS = [
    dict(
        slug="golden-hour",
        title="Golden Hour",
        bpm=90,
        key="D",
        mode="major",
        prog=["Gmaj9", "F#m7", "Em9", "A13", "Gmaj9", "F#m7 B7b9", "Em9", "A9sus4 A13"],
        keys="epiano",
        lead="flute",
        seed=101,
    ),
    dict(
        slug="ocean-breeze",
        title="Ocean Breeze",
        bpm=94,
        key="A",
        mode="major",
        prog=["Dmaj9", "C#m7", "Bm9", "E9sus4 E7", "Dmaj9", "C#m7 F#m9", "Bm9", "E9sus4"],
        keys="piano",
        lead="guitar",
        seed=113,
    ),
    dict(
        slug="sunday-plans",
        title="Sunday Plans",
        bpm=88,
        key="C",
        mode="major",
        prog=["Fmaj9", "Em7", "Dm9", "G13", "Fmaj9", "Em7 Am9", "Dm9", "G9sus4 G13"],
        keys="epiano",
        lead="marimba",
        seed=127,
    ),
]

ARP = [0, 2, 1, 3, 2, 1, 3, 2]


def build(cfg):
    bars = 28
    s = Song(cfg["bpm"], bars, swing=0.3, swing_unit=0.25, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    key = note_pc(cfg["key"])
    prog = cfg["prog"]
    breakdown = range(20, 24)

    # --- keys: offbeat-pushed comping
    prev = None
    for bar in range(bars):
        for k, (beat, sym) in enumerate(bar_chords(prog, bar)):
            notes = voice(sym, prev, 53, 76, rootless=True)
            prev = notes
            span = 4.0 / len(bar_chords(prog, bar))
            hits = [(0.0, 1.4, 0.58), (1.5, 0.4, 0.4), (2.5, 1.3, 0.5)] if span == 4 else [(0.0, 1.3, 0.55), (1.5, 0.4, 0.38)]
            for hb, hd, hv in hits:
                if cfg["keys"] == "piano":
                    strum(s, "keys", I.piano, notes, s.t(bar, beat + hb), s.g.beats(hd), s.h.vel(hv * 0.9), roll=0.008, pan_spread=0.6, bright=0.8)
                else:
                    strum(s, "keys", I.epiano, notes, s.t(bar, beat + hb), s.g.beats(hd), s.h.vel(hv), roll=0.01, pan_spread=0.8)

    # --- clean guitar arpeggios
    for bar in range(bars):
        if bar in breakdown:
            continue
        for i in range(8):
            beat = i * 0.5
            sym = chord_at(prog, bar, beat)
            notes = voice(sym, None, 59, 81, max_notes=4)
            m = notes[ARP[i] % len(notes)]
            v = 0.5 if i % 2 == 0 else 0.38
            s.play("gtr", I.guitar(m, s.g.beats(1.2), s.h.vel(v), bright=0.6, seed=bar * 8 + i), s.t(bar, beat), pan=-0.45)

    # --- bass: root, octave pop, approach into the next chord
    for bar in range(4, bars):
        for k, (beat, sym) in enumerate(bar_chords(prog, bar)):
            root = chord_tone(sym, "root", 33)
            span = 4.0 / len(bar_chords(prog, bar))
            if span == 4:
                nxt = chord_at(prog, bar + 1, 0)
                approach = nearest(parse(nxt)[2], root) + (1 if rng.random() < 0.5 else -1)
                pat = [(0.0, 1.3, root, 0.85), (1.5, 0.35, root + 12, 0.55), (2.5, 0.8, chord_tone(sym, "fifth", 36), 0.7), (3.5, 0.4, approach, 0.6)]
            else:
                pat = [(0.0, 1.2, root, 0.85), (1.5, 0.4, root + 12, 0.5)]
            if bar in breakdown:
                pat = pat[:1]
            for pb, pd, m, v in pat:
                s.play("bass", I.subbass(m, s.g.beats(pd), s.h.vel(v), harm=0.35, drive=1.8), s.t(bar, beat + pb))

    # --- drums
    for bar in range(bars):
        intro = bar < 4
        brk = bar in breakdown
        for i in range(16):
            beat = i * 0.25
            if not brk or i % 2 == 0:
                v = (0.45, 0.22, 0.32, 0.22)[i % 4]
                s.play("shaker", I.shaker(i % 3), s.t(bar, beat), pan=0.35, gain=s.h.vel(v * (0.6 if intro else 1)))
        if intro or brk:
            if brk:
                s.play("perc", I.rim(bar % 2), s.t(bar, 3.0), pan=-0.2, gain=0.5)
            continue
        kicks = [0.0, 1.75, 2.5] if bar % 2 == 0 else [0.0, 2.0, 2.75]
        for kb in kicks:
            s.kick("kick", I.kick("pop", int(rng.integers(3))), s.t(bar, kb), gain=s.h.vel(0.85))
        for sb in (1.0, 3.0):
            s.play("snare", I.snare("tight", int(rng.integers(3))), s.t(bar, sb) + 0.008, gain=s.h.vel(0.7))
        for hb in np.arange(0, 4, 0.5):
            s.play("hats", I.hat(False, int(rng.integers(3))), s.t(bar, hb), pan=0.2, gain=s.h.vel(0.42 if hb % 1 == 0 else 0.3))
        if bar % 4 == 3:
            s.play("hats", I.hat(True, 0), s.t(bar, 3.5), pan=0.2, gain=0.3)
            s.play("perc", I.rim(1), s.t(bar, 3.75), pan=-0.2, gain=0.35)

    # --- pad under the B section
    prev = None
    for bar in range(12, 20):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, prev, 55, 74, max_notes=4)
        prev = notes
        for m in notes:
            s.play("pad", I.pad(m, s.g.bar_len, 0.4, cutoff=1100, a=0.6, r=1.0), s.t(bar, 0, human=False))

    # --- lead
    lo, hi = {"flute": (67, 86), "guitar": (62, 81), "marimba": (67, 88)}[cfg["lead"]]
    plan = [(4, 0, False), (8, 0, True), (12, 1, False), (16, 1, True), (20, 2, False), (24, 0, True)]
    for bar0, which, final in plan:
        seed = cfg["seed"] * 5 + which * 37
        notes = melody(np.random.default_rng(seed), phrase_chords(prog, bar0, 4), key, cfg["mode"], lo, hi, RHYTHMS, CADENCE, final=final)
        if cfg["lead"] == "flute":
            place_melody(s, "lead", notes, bar0, I.flute, legato=0.95)
        elif cfg["lead"] == "guitar":
            place_melody(s, "lead", notes, bar0, I.guitar, gain=1.5, bright=0.65)
        else:
            place_melody(s, "lead", notes, bar0, I.marimba, gain=1.2)

    room = make_ir(1.1, predelay=0.01, damping=0.5, size=0.55, seed=cfg["seed"])
    hall = make_ir(2.4, predelay=0.025, damping=0.45, size=1.1, seed=cfg["seed"] + 1)
    keys_fx = [lambda x: autopan(x, 3.5, 0.3)] if cfg["keys"] == "epiano" else []
    spec = {
        "keys": dict(db=-2.0, eq=[("hp", 140.0), ("peak", 320.0, -3.0, 1.0), ("peak", 3000.0, 1.5, 0.8)], fx=keys_fx, rev={"room": 0.2, "hall": 0.12}, sc=0.2),
        "gtr": dict(db=8.0, eq=[("hp", 200.0), ("peak", 2500.0, 2.0, 0.9), ("highshelf", 8000.0, -2.0)], fx=[lambda x: chorus(x, 0.7, 2.0, mix=0.45)], rev={"hall": 0.22}, dly=0.15),
        "bass": dict(db=-5.0, eq=[("hp", 38.0), ("lp", 1400.0)], sc=0.3),
        "kick": dict(db=-6.0, eq=[("hp", 40.0)]),
        "snare": dict(db=3.0, eq=[("hp", 160.0)], rev={"room": 0.25}),
        "hats": dict(db=5.0, eq=[("lp", 13000.0)], rev={"room": 0.08}),
        "shaker": dict(db=2.0, rev={"room": 0.1}),
        "perc": dict(db=9.0, rev={"room": 0.2}),
        "pad": dict(db=1.0, eq=[("hp", 200.0)], rev={"hall": 0.3}, sc=0.25),
        "lead": dict(db=0.0, eq=[("hp", 250.0)], rev={"hall": 0.3}, dly=0.2),
    }
    return s.mix(
        spec,
        irs={"room": room, "hall": hall},
        delay=dict(time=s.g.beats(0.75), fb=0.32, tone=3500.0),
        master_fx=[lambda x: saturate(x * 1.1, 1.2) / 1.1, lambda x: eq(x, ("highshelf", 10000.0, -1.0))],
        target=-15.5,
    )
