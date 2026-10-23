"""Lo-fi hip hop: dusty swung drums, Rhodes on rootless ninth voicings,
round sub bass, a sparse lead, vinyl and tape wobble."""

import numpy as np

import instruments as I
from common import bar_chords, chord_tone, phrase_chords, place_melody, strum
from engine import SR, autopan, chorus, eq, make_ir, saturate, tape
from song import Song
from theory import melody, note_pc, voice

RHYTHMS = [
    [(0.0, 1.5), (1.5, 0.5), (2.0, 1.5)],
    [(0.5, 0.5), (1.0, 1.0), (2.5, 1.0)],
    [(0.0, 0.75), (0.75, 0.75), (1.5, 2.0)],
    [(1.0, 0.5), (1.5, 0.5), (2.0, 0.5), (2.5, 1.25)],
    [(0.0, 0.5), (0.5, 0.5), (1.0, 1.5), (3.0, 0.75)],
]
CADENCE = [(0.0, 0.75), (0.75, 2.75)]

TRACKS = [
    dict(
        slug="rainy-window",
        title="Rainy Window",
        bpm=74,
        key="F",
        mode="major",
        prog=["Bbmaj9", "Am7", "Gm9", "C9sus4 C7b9", "Fmaj9", "Dm9", "Gm9", "C9sus4 C7"],
        lead="piano",
        rain=True,
        seed=11,
    ),
    dict(
        slug="coffee-and-vinyl",
        title="Coffee & Vinyl",
        bpm=82,
        key="C",
        mode="minor",
        prog=["Abmaj9", "G7#9", "Cm9", "Bbm9 Eb9", "Abmaj9", "G7#9", "Cm9", "Fm9 G7b9"],
        lead="guitar",
        rain=False,
        seed=23,
    ),
    dict(
        slug="midnight-study",
        title="Midnight Study",
        bpm=70,
        key="D",
        mode="major",
        prog=["Em9", "A13", "Dmaj9", "Bm9", "Gmaj9", "F#m7", "Em9", "A9sus4 A13"],
        lead="bell",
        rain=False,
        seed=37,
    ),
]

KICK_PATTERNS = [[0.0, 1.75, 2.5], [0.0, 2.25, 2.5], [0.0, 0.75, 2.5], [0.0, 2.5, 3.75]]


def rain(n, seed):
    rng = np.random.default_rng(seed)
    bed = eq(rng.standard_normal((2, n)), ("hp", 900.0), ("lp", 7000.0), ("peak", 3000.0, 3.0, 0.7)) * 0.010
    drops = np.zeros((2, n))
    for p in rng.integers(0, n - 400, int(n / SR * 40)):
        ln = int(rng.integers(40, 300))
        c = int(rng.integers(0, 2))
        f = rng.uniform(1800, 5500)
        tt = np.arange(ln) / SR
        drops[c, p : p + ln] += np.sin(6.283 * f * tt * (1 - tt * 8)) * np.exp(-tt / 0.004) * rng.lognormal(-4.2, 0.6)
    return bed + drops


def build(cfg):
    bars = 24
    s = Song(cfg["bpm"], bars, swing=0.55, swing_unit=0.25, seed=cfg["seed"])
    rng = np.random.default_rng(cfg["seed"])
    key = note_pc(cfg["key"])
    prog = cfg["prog"]

    # --- Rhodes comp: rolled rootless voicings, lazy anticipations
    prev = None
    for bar in range(bars):
        chords = bar_chords(prog, bar)
        stem = "keys_intro" if bar < 4 else "keys"
        for k, (beat, sym) in enumerate(chords):
            notes = voice(sym, prev, 52, 74, rootless=True)
            prev = notes
            if len(chords) == 1:
                hits = [(0.0, 1.6, 0.62), (1.75, 0.6, 0.45), (2.5, 1.4, 0.55)] if bar % 2 == 0 else [(0.0, 2.4, 0.6), (2.75, 1.1, 0.48)]
            else:
                hits = [(0.0, 1.4, 0.6), (1.5, 0.45, 0.42)] if k == 0 else [(0.0, 1.8, 0.57)]
            for hb, hd, hv in hits:
                strum(s, stem, I.epiano, notes, s.t(bar, beat + hb), s.g.beats(hd), s.h.vel(hv), roll=0.014, pan_spread=0.9)

    # --- sub bass
    for bar in range(4, bars):
        chords = bar_chords(prog, bar)
        for k, (beat, sym) in enumerate(chords):
            root = chord_tone(sym, "root", 33)
            if len(chords) == 1:
                pat = [(0.0, 1.4, root, 0.85), (1.75, 0.2, root, 0.5), (2.5, 1.0, chord_tone(sym, "fifth", 36), 0.7)]
                if bar % 4 == 3:
                    pat[-1] = (2.5, 0.9, root + 12, 0.6)
            else:
                pat = [(0.0, 1.6, root, 0.85)]
            for pb, pd, m, v in pat:
                s.play("bass", I.subbass(m, s.g.beats(pd), s.h.vel(v)), s.t(bar, beat + pb))

    # --- drums
    for bar in range(2, bars):
        full = 4 <= bar < 20
        outro = bar >= 20
        kp = KICK_PATTERNS[(bar // 2 + rng.integers(0, 2)) % len(KICK_PATTERNS)]
        if full or outro:
            for kb in kp:
                s.kick("kick", I.kick("lofi", int(rng.integers(3))), s.t(bar, kb), gain=s.h.vel(0.85))
        if full:
            for sb in (1.0, 3.0):
                s.play("snare", I.snare("lofi", int(rng.integers(3))), s.t(bar, sb) + 0.012, gain=s.h.vel(0.75))
            if rng.random() < 0.4:
                s.play("snare", I.snare("lofi", 2), s.t(bar, 3.75), gain=0.18)
        for hb in np.arange(0, 4, 0.5):
            v = 0.55 if hb % 1 == 0 else 0.32
            if bar < 4:
                v *= 0.6
            s.play("hats", I.hat(False, int(rng.integers(3))), s.t(bar, hb), pan=0.15, gain=s.h.vel(v))
        if full and bar % 4 == 3:
            for hb in (3.25, 3.75):
                s.play("hats", I.hat(False, 1), s.t(bar, hb), pan=0.15, gain=0.22)
        if bar % 8 == 7 and full:
            s.play("hats", I.hat(True, 0), s.t(bar, 3.5), pan=0.15, gain=0.25)

    # --- lead: phrase A (and its answer) for bars 4-11, phrase B for 12-19
    lead = cfg["lead"]
    lo, hi = (62, 81) if lead != "bell" else (69, 88)
    for sec, bar0 in (("A", 4), ("B", 12)):
        seed = cfg["seed"] * 7 + (0 if sec == "A" else 99)
        for half in (0, 4):
            notes = melody(np.random.default_rng(seed), phrase_chords(prog, bar0 + half, 4), key, cfg["mode"], lo, hi, RHYTHMS, CADENCE, final=half == 4)
            if lead == "piano":
                place_melody(s, "lead", notes, bar0 + half, I.piano, gain=0.9, bright=0.55)
            elif lead == "guitar":
                place_melody(s, "lead", notes, bar0 + half, I.guitar, gain=1.4, bright=0.35)
            else:
                place_melody(s, "lead", notes, bar0 + half, I.bell, gain=0.9, ratio=4.0, index=1.2, tau=1.6)

    # --- textures
    s.stem("vinyl").buf += I.vinyl(s.n, cfg["seed"], density=6.0)
    if cfg["rain"]:
        s.stem("rain").buf += rain(s.n, cfg["seed"])

    room = make_ir(1.4, predelay=0.012, damping=0.7, size=0.6, seed=cfg["seed"])
    hall = make_ir(2.8, predelay=0.03, damping=0.6, size=1.2, seed=cfg["seed"] + 1)
    lead_eq = [("hp", 250.0), ("lp", 9000.0)]
    keys_fx = [lambda x: autopan(x, 4.2, 0.4), lambda x: chorus(x, rate=0.5, depth_ms=1.8, mix=0.35)]
    spec = {
        "keys": dict(db=-1.0, eq=[("hp", 120.0), ("lp", 7500.0), ("peak", 350.0, -2.5, 1.0), ("peak", 2500.0, 2.0, 0.8)], fx=keys_fx, rev={"room": 0.25, "hall": 0.12}, sc=0.25),
        "keys_intro": dict(db=-2.0, eq=[("hp", 150.0), ("lp", 2200.0)], fx=keys_fx, rev={"room": 0.3, "hall": 0.2}),
        "bass": dict(db=-5.0, eq=[("hp", 38.0), ("lp", 900.0)], sc=0.35),
        "kick": dict(db=-7.0, eq=[("hp", 40.0), ("peak", 3000.0, 2.0, 1.0)]),
        "snare": dict(db=4.0, eq=[("hp", 150.0), ("lp", 9000.0)], rev={"room": 0.22}),
        "hats": dict(db=7.0, eq=[("lp", 11000.0)], rev={"room": 0.1}),
        "lead": dict(db=3.0, eq=lead_eq, rev={"hall": 0.35}, dly=0.22),
        "vinyl": dict(db=2.0),
        "rain": dict(db=-6.0, width=1.4),
    }
    return s.mix(
        spec,
        irs={"room": room, "hall": hall},
        delay=dict(time=s.g.beats(0.75), fb=0.35, tone=2500.0),
        master_fx=[
            lambda x: tape(x, wow=0.0011, flutter=0.00018, seed=cfg["seed"]),
            lambda x: saturate(x * 1.2, 1.3) / 1.2,
            lambda x: eq(x, ("highshelf", 9000.0, -2.0), ("lp", 15000.0)),
        ],
        target=-16.0,
    )
