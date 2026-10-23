"""Solo piano: a neo-classical arpeggio piece, a 3/4 waltz and a slow
nocturne. Bass-left/treble-right stereo, pedalled harmonies, phrase
dynamics that swell into the middle section."""

import numpy as np

import instruments as I
from common import bar_chords, chord_at, chord_tone, phrase_chords
from engine import eq, make_ir
from song import Song
from theory import chord_pcs, melody, nearest, note_pc, voice

TRACKS = [
    dict(
        slug="first-light",
        title="First Light",
        style="arpeggio",
        bpm=72,
        bpb=4,
        key="A",
        mode="minor",
        prog=["Am", "F", "C", "G", "Am", "F", "C", "G/B"],
        seed=601,
    ),
    dict(
        slug="paper-letters",
        title="Paper Letters",
        style="waltz",
        bpm=84,
        bpb=3,
        key="E",
        mode="minor",
        prog=["Em", "C", "G", "D", "Em", "C", "Am7", "B7"],
        seed=613,
    ),
    dict(
        slug="night-rain",
        title="Night Rain",
        style="nocturne",
        bpm=60,
        bpb=4,
        key="Db",
        mode="major",
        prog=["Dbmaj9", "Bbm9", "Gbmaj9", "Absus4 Ab", "Dbmaj9/F", "Bbm9", "Gbmaj9", "Ab9sus4"],
        seed=627,
    ),
]

RHYTHMS = {
    4: [
        [(0.0, 1.5), (1.5, 0.5), (2.0, 2.0)],
        [(0.0, 1.0), (1.0, 1.0), (2.0, 1.5), (3.5, 0.5)],
        [(0.5, 0.5), (1.0, 1.0), (2.0, 2.0)],
        [(0.0, 2.0), (2.0, 1.0), (3.0, 1.0)],
    ],
    3: [
        [(0.0, 1.0), (1.0, 1.0), (2.0, 1.0)],
        [(0.0, 2.0), (2.0, 1.0)],
        [(0.0, 1.5), (1.5, 0.5), (2.0, 1.0)],
        [(0.0, 1.0), (1.0, 2.0)],
    ],
}
CADENCE = {4: [(0.0, 1.0), (1.0, 3.0)], 3: [(0.0, 3.0)]}


def pan_of(m):
    return float(np.clip((m - 62) / 30.0, -0.45, 0.45))


def dynamics(bar, bars):
    """Phrase-level dynamics: soft intro, swell into the middle, settle."""
    x = bar / bars
    return 0.72 + 0.28 * np.sin(np.pi * min(1.0, x * 1.15)) ** 1.5


def build(cfg):
    bpb = cfg["bpb"]
    bars = {"arpeggio": 24, "waltz": 32, "nocturne": 20}[cfg["style"]]
    s = Song(cfg["bpm"], bars, bpb=bpb, seed=cfg["seed"])
    s.h.ms = 6.0
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    style = cfg["style"]

    def play(m, beats, v, bar, beat, bright=0.75):
        s.play("piano", I.piano(m, s.g.beats(beats), s.h.vel(v), bright=bright, seed=int(beat * 4)), s.t(bar, beat), pan=pan_of(m))

    # ----- left hand
    for bar in range(bars):
        dyn = dynamics(bar, bars)
        for k, (beat, sym) in enumerate(bar_chords(prog, bar, bpb)):
            span = bpb / len(bar_chords(prog, bar, bpb))
            root = chord_tone(sym, "root", 33 if style != "waltz" else 36)
            fifth = chord_tone(sym, "fifth", root + 1)
            third = chord_tone(sym, "third", root + 12)
            if style == "arpeggio":
                stack = [root, fifth, root + 12, third + (12 if third < root + 12 else 0)]
                pat = [0, 1, 2, 1, 3, 1, 2, 1]
                for i, idx in enumerate(pat[: int(span * 2)]):
                    ring = span - i * 0.5 + 0.4
                    play(stack[idx], ring, (0.5 if i == 0 else 0.36) * dyn, bar, beat + i * 0.5, bright=0.6)
            elif style == "waltz":
                play(root, 3.0, 0.52 * dyn, bar, 0.0, bright=0.6)
                chord = voice(sym, None, 52, 64, max_notes=3)
                for b2 in (1.0, 2.0):
                    for m in chord:
                        play(m, 0.85, 0.3 * dyn, bar, b2, bright=0.55)
            else:
                stack = [root, fifth, third + 12 if third + 12 - root < 20 else third, root + 24 if root + 24 < 62 else root + 12]
                for i in range(int(span * 2)):
                    idx = [0, 1, 2, 3, 2, 1, 2, 1][i]
                    play(stack[idx], span - i * 0.5 + 0.6, (0.42 if i == 0 else 0.28) * dyn, bar, beat + i * 0.5, bright=0.5)

    # ----- right hand melody (+ harmony under long notes in the middle)
    if style == "arpeggio":
        plan = [(4, 0, False, 0), (8, 0, True, 0), (12, 1, False, 1), (16, 1, True, 1)]
        lo, hi = 67, 86
    elif style == "waltz":
        plan = [(4, 0, False, 0), (8, 0, True, 0), (12, 0, False, 1), (16, 0, True, 1), (20, 1, False, 1), (24, 1, True, 0)]
        lo, hi = 64, 84
    else:
        plan = [(4, 0, False, 0), (8, 0, True, 0), (12, 1, False, 1), (16, 1, True, 0)]
        lo, hi = 65, 84
    for bar0, which, final, rich in plan:
        notes = melody(np.random.default_rng(cfg["seed"] + which * 11), phrase_chords(prog, bar0, 4, bpb), key, cfg["mode"], lo, hi, RHYTHMS[bpb], CADENCE[bpb], final=final, bpb=bpb)
        for b, beat, dur, m, v in notes:
            bar = bar0 + b
            dyn = dynamics(bar, bars)
            play(m, dur + 0.15, (v + 0.08) * dyn, bar, beat, bright=0.85)
            if rich:
                if dur >= 1.0:
                    pcs = chord_pcs(chord_at(prog, bar, beat, bpb), False)
                    under = max((n for n in range(m - 9, m - 2) if n % 12 in pcs), default=None)
                    if under:
                        play(under, dur + 0.1, v * 0.55 * dyn, bar, beat + 0.01, bright=0.7)
                elif style == "arpeggio":
                    play(m - 12, dur + 0.1, v * 0.45 * dyn, bar, beat, bright=0.7)

    hall = make_ir(2.6, predelay=0.022, damping=0.55, size=1.1, seed=cfg["seed"], width=1.1)
    spec = {
        "piano": dict(db=0.0, eq=[("hp", 35.0), ("peak", 250.0, -1.5, 0.9), ("highshelf", 7000.0, 0.5)], rev={"hall": 0.32}),
    }
    return s.mix(spec, irs={"hall": hall}, target=-18.0, glue=False)
