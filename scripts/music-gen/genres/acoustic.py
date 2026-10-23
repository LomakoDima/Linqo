"""Acoustic: steel/nylon guitars played from real chord shapes — Travis
fingerpicking, double-tracked strumming, a 3/4 campfire pattern — with
upright bass, cajon/shaker and a guitar or whistle lead."""

import numpy as np

import instruments as I
from common import bar_chords, chord_tone, phrase_chords, place_melody
from engine import eq, make_ir
from song import Song
from theory import melody, note_pc, shape_notes

RHYTHMS = {
    4: [
        [(0.0, 1.0), (1.0, 0.5), (1.5, 1.0), (2.5, 1.5)],
        [(0.5, 0.5), (1.0, 1.0), (2.0, 1.0), (3.0, 1.0)],
        [(0.0, 1.5), (1.5, 0.5), (2.0, 2.0)],
        [(0.0, 0.5), (0.5, 0.5), (1.0, 1.0), (2.5, 1.5)],
    ],
    3: [
        [(0.0, 1.0), (1.0, 1.0), (2.0, 1.0)],
        [(0.0, 2.0), (2.0, 1.0)],
        [(0.0, 1.5), (1.5, 0.5), (2.0, 1.0)],
    ],
}
CADENCE = {4: [(0.0, 1.0), (1.0, 3.0)], 3: [(0.0, 3.0)]}

TRACKS = [
    dict(
        slug="porch-light",
        title="Porch Light",
        style="travis",
        bpm=92,
        bpb=4,
        key="G",
        mode="major",
        prog=["G", "Cadd9", "Em7", "Dsus4 D", "G", "Cadd9", "Em7", "Dsus4"],
        seed=801,
    ),
    dict(
        slug="open-road",
        title="Open Road",
        style="strum",
        bpm=104,
        bpb=4,
        key="D",
        mode="major",
        prog=["D", "A/C#", "Bm7", "G", "D", "A/C#", "G", "A"],
        seed=813,
    ),
    dict(
        slug="campfire",
        title="Campfire",
        style="waltz",
        bpm=96,
        bpb=3,
        key="A",
        mode="minor",
        prog=["Am", "Fmaj7", "C", "G", "Am", "Fmaj7", "Dm", "E7"],
        seed=827,
    ),
]

# Chord-shape name -> symbol the harmony helpers understand.
SYMBOL = {"Cadd9": "Cadd9", "A/C#": "A/C#", "D/F#": "D/F#"}

STRUM = [(0.0, True, 0.75), (1.0, True, 0.6), (1.5, False, 0.45), (2.5, False, 0.5), (3.0, True, 0.65), (3.5, False, 0.45)]


def build(cfg):
    bpb = cfg["bpb"]
    bars = {"travis": 28, "strum": 32, "waltz": 36}[cfg["style"]]
    s = Song(cfg["bpm"], bars, bpb=bpb, swing=0.15 if cfg["style"] == "travis" else 0.0, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    style = cfg["style"]

    def pick(stem, m, beats, v, bar, beat, pan, bright=0.5):
        s.play(stem, I.guitar(m, s.g.beats(beats), s.h.vel(v), bright=bright, seed=int(beat * 2) + bar), s.t(bar, beat), pan=pan)

    for bar in range(bars):
        for k, (beat, shape) in enumerate(bar_chords(prog, bar, bpb)):
            span = bpb / len(bar_chords(prog, bar, bpb))
            notes = shape_notes(shape)
            bass, treble = notes[:-3], notes[-3:]
            if style == "travis":
                low = bass[0]
                alt = bass[-1] if len(bass) > 1 else bass[0] + 7
                slots = [(0.0, low, 0.62), (0.5, treble[2], 0.42), (1.0, alt, 0.5), (1.5, treble[1], 0.4), (2.0, bass[min(1, len(bass) - 1)], 0.55), (2.5, treble[2], 0.42), (3.0, alt, 0.5), (3.5, treble[0], 0.38)]
                for sb, m, v in slots:
                    if sb < span:
                        pick("gtr", m, 1.6, v, bar, beat + sb, -0.3 if m < 55 else -0.1)
            elif style == "strum":
                for take, pan in (("gtrL", -0.7), ("gtrR", 0.7)):
                    for sb, down, v in STRUM:
                        if sb >= span:
                            continue
                        nxt = next((x[0] for x in STRUM if x[0] > sb), 4.0)
                        dur = min(nxt, span) - sb
                        strings = notes if down else notes[-4:][::-1]
                        t0 = s.t(bar, beat + sb) + (0.0 if take == "gtrL" else 0.006)
                        for i, m in enumerate(strings):
                            vv = s.h.vel(v * (1.0 if down else 0.8))
                            s.play(take, I.guitar(m, max(0.08, s.g.beats(dur) - 0.02), vv, bright=0.55 if down else 0.7, seed=i + (7 if take == "gtrR" else 0)), t0 + i * 0.009, pan=pan)
            else:
                low = bass[0]
                pattern = [(0.0, low, 0.6), (1.0, treble[0], 0.4), (1.5, treble[1], 0.4), (2.0, treble[2], 0.42), (2.5, treble[1], 0.38)]
                for sb, m, v in pattern:
                    pick("gtr", m, 2.0, v, bar, beat + sb, -0.25 if m < 55 else -0.05, bright=0.4)

    # upright bass from bar 4
    for bar in range(4, bars):
        for k, (beat, shape) in enumerate(bar_chords(prog, bar, bpb)):
            sym = SYMBOL.get(shape, shape)
            root = chord_tone(sym, "root", 33)
            if bpb == 3:
                pat = [(0.0, 1.8, root)]
            elif len(bar_chords(prog, bar, bpb)) == 1:
                pat = [(0.0, 1.8, root), (2.0, 1.4, chord_tone(sym, "fifth", 33))]
            else:
                pat = [(0.0, 1.8, root)]
            for pb, pd, m in pat:
                s.play("bass", I.upright(m, s.g.beats(pd), s.h.vel(0.65)), s.t(bar, beat + pb))

    # percussion
    perc_from = {"travis": 12, "strum": 4, "waltz": 12}[style]
    for bar in range(perc_from, bars):
        steps = int(bpb * 2)
        for i in range(steps):
            s.play("shaker", I.shaker(i % 3), s.t(bar, i * 0.5), pan=0.45, gain=s.h.vel(0.4 if i % 2 else 0.25))
        if style == "strum":
            for cb in (0.0, 2.5):
                s.play("cajon", I.cajon(False, int(rng.integers(2))), s.t(bar, cb), gain=s.h.vel(0.75))
            for cb in (1.0, 3.0):
                s.play("cajon", I.cajon(True, int(rng.integers(2))), s.t(bar, cb), pan=0.1, gain=s.h.vel(0.6))
        elif style == "travis" and bar >= 12:
            s.play("cajon", I.cajon(False, 0), s.t(bar, 0.0), gain=0.55)
            s.play("cajon", I.cajon(True, 1), s.t(bar, 2.0), pan=0.1, gain=0.4)

    # lead
    if style == "travis":
        plan = [(4, 0, False, "gtr"), (8, 0, True, "gtr"), (16, 1, False, "gtr"), (20, 1, True, "gtr")]
    elif style == "strum":
        plan = [(8, 0, False, "gtr"), (12, 0, True, "gtr"), (16, 1, False, "whistle"), (20, 1, True, "whistle"), (24, 0, False, "gtr"), (28, 0, True, "gtr")]
    else:
        plan = [(4, 0, False, "gtr"), (8, 0, True, "gtr"), (16, 1, False, "whistle"), (20, 1, True, "whistle"), (24, 0, False, "gtr"), (28, 0, True, "gtr")]
    for bar0, which, final, inst in plan:
        chords = [[(b, SYMBOL.get(sh, sh)) for b, sh in bc] for bc in phrase_chords(prog, bar0, 4, bpb)]
        lo, hi = (62, 81) if inst == "gtr" else (72, 91)
        notes = melody(np.random.default_rng(cfg["seed"] + which * 19), chords, key, cfg["mode"], lo, hi, RHYTHMS[bpb], CADENCE[bpb], final=final, bpb=bpb)
        if inst == "gtr":
            place_melody(s, "lead", notes, bar0, I.guitar, pan=0.35, gain=1.6, bright=0.7)
        else:
            place_melody(s, "whistle", notes, bar0, I.flute, pan=0.25, legato=0.95)

    room = make_ir(1.2, predelay=0.012, damping=0.5, size=0.6, seed=cfg["seed"])
    body = [("hp", 75.0), ("peak", 105.0, 3.0, 1.3), ("peak", 420.0, -3.5, 1.0), ("peak", 3200.0, 2.5, 0.8), ("highshelf", 9000.0, 2.0)]
    spec = {
        "gtr": dict(db=6.0, eq=body, rev={"room": 0.25}, width=1.3),
        "gtrL": dict(db=1.0, eq=body, rev={"room": 0.2}),
        "gtrR": dict(db=1.0, eq=body, rev={"room": 0.2}),
        "lead": dict(db=7.0, eq=body, rev={"room": 0.3}),
        "whistle": dict(db=-1.0, eq=[("hp", 400.0)], rev={"room": 0.35}),
        "bass": dict(db=5.0, eq=[("hp", 35.0), ("lp", 2200.0)], rev={"room": 0.05}),
        "shaker": dict(db=6.0, rev={"room": 0.15}),
        "cajon": dict(db=0.0, eq=[("hp", 45.0)], rev={"room": 0.2}),
    }
    return s.mix(spec, irs={"room": room}, target=-17.0)
