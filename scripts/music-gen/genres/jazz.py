"""Jazz in three flavours: a medium-swing piano trio (walking bass, ride,
head + bebop solo), a brushed Rhodes ballad, and a bossa nova with nylon
guitar and flute."""

import numpy as np

import instruments as I
from common import bar_chords, chord_at, chord_tone, chords_by_beat, phrase_chords, place_melody, strum
from engine import autopan, eq, make_ir, saturate
from song import Song
from theory import bebop_line, melody, note_pc, voice, walking_bass

RHYTHMS = [
    [(0.0, 1.5), (1.5, 0.5), (2.0, 1.0), (3.0, 0.5), (3.5, 0.5)],
    [(0.5, 0.5), (1.0, 0.5), (1.5, 1.5), (3.0, 1.0)],
    [(0.0, 0.5), (0.5, 0.5), (1.0, 0.5), (1.5, 0.5), (2.0, 1.5)],
    [(1.0, 1.0), (2.0, 0.5), (2.5, 1.5)],
]
CADENCE = [(0.0, 0.5), (0.5, 0.5), (1.0, 2.5)]

BOSSA_RHYTHMS = [
    [(0.0, 1.5), (1.5, 1.0), (2.5, 1.5)],
    [(0.0, 0.5), (0.5, 0.5), (1.0, 1.0), (2.0, 2.0)],
    [(0.5, 1.0), (1.5, 0.5), (2.0, 0.5), (2.5, 1.5)],
]
BOSSA_CADENCE = [(0.0, 1.0), (1.0, 3.0)]

TRACKS = [
    dict(
        slug="blue-corner",
        title="Blue Corner",
        style="swing",
        bpm=132,
        key="Bb",
        mode="major",
        prog=["Cm7 F7", "Bbmaj7", "Ebmaj7", "Dm7 G7b9", "Cm7", "F7", "Bbmaj7 G7b9", "Cm7 F7"],
        seed=401,
    ),
    dict(
        slug="velvet-hour",
        title="Velvet Hour",
        style="ballad",
        bpm=72,
        key="Db",
        mode="major",
        prog=["Gbmaj7", "Fm7 Bb7b9", "Ebm9", "Ab13", "Dbmaj9", "Bbm9", "Ebm9", "Ab7sus4 Ab7"],
        seed=413,
    ),
    dict(
        slug="rio-twilight",
        title="Rio Twilight",
        style="bossa",
        bpm=128,
        key="D",
        mode="minor",
        prog=["Dm9", "Dm9", "Em7b5", "A7b9", "Dm9", "Gm9 C9", "Fmaj7", "Em7b5 A7b9"],
        seed=427,
    ),
]


def _swing(cfg):
    s = Song(cfg["bpm"], 40, swing=0.8, swing_unit=0.5, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bars = s.g.bars

    # comping: Charleston + pushes, rootless drop voicings
    prev = None
    for bar in range(bars):
        for k, (beat, sym) in enumerate(bar_chords(prog, bar)):
            notes = voice(sym, prev, 50, 70, rootless=True, drop=True, max_notes=4)
            prev = notes
            two = len(bar_chords(prog, bar)) == 2
            r = rng.random()
            if two:
                hits = [(0.0, 0.9)] if r < 0.6 else [(0.5, 0.6)]
            elif r < 0.45:
                hits = [(0.0, 1.2), (1.5, 0.4)]
            elif r < 0.75:
                hits = [(0.5, 0.4), (2.5, 0.8)]
            else:
                hits = [(1.0, 0.4), (2.5, 0.4), (3.5, 0.5)]
            for hb, hd in hits:
                strum(s, "comp", I.piano, notes, s.t(bar, beat + hb), s.g.beats(hd), s.h.vel(0.42), roll=0.004, pan_spread=0.9, bright=0.7)

    for b, beat, dur, m, v in walking_bass(rng, chords_by_beat(prog, bars)):
        s.play("bass", I.upright(m, s.g.beats(dur), s.h.vel(v), seed=int(beat)), s.t(b, beat))

    # head (bars 8-23), solo (24-35)
    for bar0, which, final in ((8, 0, False), (12, 0, True), (16, 1, False), (20, 1, True)):
        notes = melody(np.random.default_rng(cfg["seed"] + which * 17), phrase_chords(prog, bar0, 4), key, cfg["mode"], 65, 86, RHYTHMS, CADENCE, final=final)
        place_melody(s, "lead", notes, bar0, I.piano, gain=1.0, pan=0.2, bright=1.0)
    line = bebop_line(rng, chords_by_beat(prog, 12, start=24), 62, 86, 72)
    for b, beat, dur, m, v in line:
        s.play("lead", I.piano(m, s.g.beats(dur), s.h.vel(v * 0.95), bright=1.0), s.t(b, beat), pan=0.2)

    # drums: ride "ding ding-a", hi-hat foot on 2 & 4, feathered kick, ghost snare
    for bar in range(bars):
        for beat, v in ((0.0, 0.55), (1.0, 0.7), (1.5, 0.4), (2.0, 0.55), (3.0, 0.7), (3.5, 0.4)):
            s.play("ride", I.ride(int(rng.integers(3))), s.t(bar, beat), pan=0.5, gain=s.h.vel(v))
        for beat in (1.0, 3.0):
            s.play("hhfoot", I.hat(False, 2, tone=0.7), s.t(bar, beat), pan=-0.4, gain=0.5)
        for beat in range(4):
            s.kick("kick", I.kick("soft", beat % 3), s.t(bar, beat), gain=0.16)
        for off in (0.5, 1.5, 2.5, 3.5):
            if rng.random() < 0.22:
                s.play("snare", I.snare("tight", int(rng.integers(3))), s.t(bar, off), pan=-0.1, gain=s.h.vel(0.18))
        if bar % 8 == 7:
            for beat in (2.5, 3.0, 3.5):
                s.play("snare", I.snare("tight", 1), s.t(bar, beat), pan=-0.1, gain=0.35)

    room = make_ir(1.3, predelay=0.012, damping=0.6, size=0.7, seed=cfg["seed"])
    spec = {
        "comp": dict(db=-3.0, eq=[("hp", 120.0), ("peak", 400.0, -2.0, 1.0)], rev={"room": 0.3}, width=1.6),
        "lead": dict(db=0.0, eq=[("hp", 150.0), ("peak", 3000.0, 1.5, 1.0)], rev={"room": 0.3}),
        "bass": dict(db=0.0, eq=[("hp", 35.0), ("peak", 90.0, 2.0, 1.0), ("lp", 3000.0)], rev={"room": 0.08}),
        "ride": dict(db=-3.0, eq=[("hp", 1500.0)], rev={"room": 0.25}),
        "hhfoot": dict(db=8.0, eq=[("lp", 9000.0)], rev={"room": 0.2}),
        "kick": dict(db=-6.0, eq=[("lp", 2000.0)]),
        "snare": dict(db=2.0, rev={"room": 0.35}),
    }
    return s.mix(spec, irs={"room": room}, master_fx=[lambda x: saturate(x, 1.1)], target=-16.5)


def _ballad(cfg):
    s = Song(cfg["bpm"], 24, swing=0.55, swing_unit=0.5, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bars = s.g.bars

    prev = None
    for bar in range(bars):
        chords = bar_chords(prog, bar)
        for k, (beat, sym) in enumerate(chords):
            notes = voice(sym, prev, 51, 72, rootless=True, max_notes=4)
            prev = notes
            hits = [(0.0, 2.3, 0.5), (2.5, 1.4, 0.38)] if len(chords) == 1 else [(0.0, 1.8, 0.48)]
            for hb, hd, hv in hits:
                strum(s, "keys", I.epiano, notes, s.t(bar, beat + hb), s.g.beats(hd), s.h.vel(hv), roll=0.018, pan_spread=0.8, bark=0.6)

    # two-feel bass
    for bar in range(4, bars):
        chords = bar_chords(prog, bar)
        for k, (beat, sym) in enumerate(chords):
            root = chord_tone(sym, "root", 31)
            if len(chords) == 1:
                pat = [(0.0, 1.9, root), (2.0, 1.4, chord_tone(sym, "fifth", 31))]
                if rng.random() < 0.5:
                    pat.append((3.5, 0.45, chord_tone(chord_at(prog, bar + 1, 0), "root", 31) - 1))
            else:
                pat = [(0.0, 1.9, root)]
            for pb, pd, m in pat:
                s.play("bass", I.upright(m, s.g.beats(pd), s.h.vel(0.75)), s.t(bar, beat + pb))

    for bar0, which, final in ((4, 0, False), (8, 0, True), (12, 1, False), (16, 1, True)):
        notes = melody(np.random.default_rng(cfg["seed"] + which * 31), phrase_chords(prog, bar0, 4), key, cfg["mode"], 63, 84, RHYTHMS, CADENCE, final=final)
        place_melody(s, "lead", notes, bar0, I.piano, gain=1.0, bright=0.85)

    for bar in range(2, bars):
        for beat in range(4):
            s.play("brush", I.brush("sweep", beat % 2, length=s.g.beats(1.0)), s.t(bar, beat), pan=-0.15, gain=0.55 if bar >= 4 else 0.35)
        if bar >= 4:
            for beat in (1.0, 3.0):
                s.play("brush", I.brush("tap", int(rng.integers(2))), s.t(bar, beat), pan=-0.15, gain=0.7)
            for beat in (0.0, 1.0, 1.5, 2.0, 3.0, 3.5):
                s.play("ride", I.ride(int(rng.integers(3))), s.t(bar, beat), pan=0.35, gain=s.h.vel(0.22))
            s.kick("kick", I.kick("soft", 0), s.t(bar, 0.0), gain=0.25)

    room = make_ir(2.0, predelay=0.02, damping=0.6, size=0.9, seed=cfg["seed"])
    spec = {
        "keys": dict(db=-2.0, eq=[("hp", 120.0), ("peak", 350.0, -2.0, 1.0), ("lp", 7000.0)], fx=[lambda x: autopan(x, 3.0, 0.35)], rev={"room": 0.35}),
        "lead": dict(db=0.0, eq=[("hp", 150.0)], rev={"room": 0.4}),
        "bass": dict(db=4.0, eq=[("hp", 35.0), ("peak", 85.0, 2.0, 1.0), ("lp", 2500.0)], rev={"room": 0.08}),
        "brush": dict(db=8.0, eq=[("hp", 400.0)], rev={"room": 0.3}),
        "ride": dict(db=5.0, eq=[("hp", 1500.0)], rev={"room": 0.3}),
        "kick": dict(db=-6.0, eq=[("lp", 1500.0)]),
    }
    return s.mix(spec, irs={"room": room}, target=-17.0)


BOSSA_GTR = [(0, 0.0), (0, 1.5), (0, 3.0), (1, 1.0), (1, 2.5)]
BOSSA_RIM = [(0, 0.0), (0, 1.5), (0, 3.0), (1, 1.0), (1, 2.5)]


def _bossa(cfg):
    s = Song(cfg["bpm"], 40, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bars = s.g.bars

    prev = None
    for bar in range(bars):
        sym = chord_at(prog, bar, 0)
        for k, (beat, sy) in enumerate(bar_chords(prog, bar)):
            notes = voice(sy, prev, 52, 69, rootless=True, max_notes=4)
            prev = notes
            for half, hb in BOSSA_GTR:
                if half != bar % 2:
                    continue
                if not (beat <= hb < beat + 4.0 / len(bar_chords(prog, bar))):
                    continue
                strum(s, "gtr", I.guitar, notes, s.t(bar, hb), s.g.beats(0.9), s.h.vel(0.5), roll=0.006, pan_spread=0.5, bright=0.3)
            # thumb bass on 1 and 3
            root = chord_tone(sy, "root", 40)
            s.play("gtr", I.guitar(root, s.g.beats(1.6), s.h.vel(0.6), bright=0.25), s.t(bar, beat))
            if len(bar_chords(prog, bar)) == 1:
                s.play("gtr", I.guitar(chord_tone(sy, "fifth", 40), s.g.beats(1.6), s.h.vel(0.55), bright=0.25), s.t(bar, 2.0))

    for bar in range(4, bars):
        for k, (beat, sy) in enumerate(bar_chords(prog, bar)):
            root = chord_tone(sy, "root", 33)
            pat = [(0.0, 1.4, root), (1.5, 0.45, root)]
            if len(bar_chords(prog, bar)) == 1:
                pat += [(2.0, 1.4, chord_tone(sy, "fifth", 33)), (3.5, 0.45, chord_tone(sy, "fifth", 33))]
            for pb, pd, m in pat:
                s.play("bass", I.upright(m, s.g.beats(pd), s.h.vel(0.7)), s.t(bar, beat + pb))

    for bar0, which, final in ((8, 0, False), (12, 0, True), (16, 1, False), (20, 1, True), (28, 0, False), (32, 0, True)):
        notes = melody(np.random.default_rng(cfg["seed"] + which * 13), phrase_chords(prog, bar0, 4), key, cfg["mode"], 69, 88, BOSSA_RHYTHMS, BOSSA_CADENCE, final=final)
        place_melody(s, "lead", notes, bar0, I.flute, legato=0.95, pan=0.3)

    for bar in range(bars):
        for half, rb in BOSSA_RIM:
            if half == bar % 2:
                s.play("rim", I.rim(int(rng.integers(2))), s.t(bar, rb), pan=-0.35, gain=s.h.vel(0.5))
        for i in range(8):
            s.play("shaker", I.shaker(i % 3), s.t(bar, i * 0.5), pan=0.55, gain=s.h.vel(0.35 if i % 2 else 0.22))
        if bar >= 4:
            for kb, kv in ((0.0, 0.5), (1.5, 0.3), (2.0, 0.45), (3.5, 0.3)):
                s.kick("kick", I.kick("soft", 1), s.t(bar, kb), gain=kv)

    room = make_ir(1.5, predelay=0.015, damping=0.5, size=0.8, seed=cfg["seed"])
    spec = {
        "gtr": dict(db=6.0, fx=[lambda x: np.vstack((x[0] * 1.25, x[1] * 0.7))], eq=[("hp", 70.0), ("peak", 110.0, 2.5, 1.2), ("peak", 400.0, -3.0, 1.0), ("peak", 3000.0, 2.0, 1.0)], rev={"room": 0.25}),
        "bass": dict(db=1.0, eq=[("hp", 35.0), ("lp", 2000.0)]),
        "lead": dict(db=-1.0, eq=[("hp", 250.0)], rev={"room": 0.35}),
        "rim": dict(db=2.0, rev={"room": 0.25}),
        "shaker": dict(db=3.0, rev={"room": 0.1}),
        "kick": dict(db=-10.0, eq=[("lp", 2500.0)]),
    }
    return s.mix(spec, irs={"room": room}, target=-16.5)


def build(cfg):
    return {"swing": _swing, "ballad": _ballad, "bossa": _bossa}[cfg["style"]](cfg)
