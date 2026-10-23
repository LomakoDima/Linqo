"""Arrangement helpers shared by the genre modules."""

import numpy as np

from theory import chord_pcs, parse, root_of


def bar_chords(prog, bar, bpb=4):
    """prog entries are 'Cmaj7' or 'Dm7 G7' (split evenly across the bar)."""
    parts = prog[bar % len(prog)].split()
    step = bpb / len(parts)
    return [(i * step, p) for i, p in enumerate(parts)]


def chord_at(prog, bar, beat, bpb=4):
    cur = None
    for b, sym in bar_chords(prog, bar, bpb):
        if b <= beat + 1e-9:
            cur = sym
    return cur


def chords_by_beat(prog, bars, bpb=4, start=0):
    return [(bar, float(beat), chord_at(prog, bar, beat, bpb)) for bar in range(start, start + bars) for beat in range(bpb)]


def phrase_chords(prog, bar0, nbars, bpb=4):
    return [bar_chords(prog, b, bpb) for b in range(bar0, bar0 + nbars)]


def chord_tone(sym, which, lo):
    """which: 'root' | 'third' | 'fifth' | 'seventh' at or above lo."""
    root, ivs, bass = parse(sym)
    iv = {"root": 0, "third": ivs[1] if len(ivs) > 1 else 0, "fifth": 6 if 6 in ivs else 7, "seventh": ivs[3] if len(ivs) > 3 else 0}[which]
    pc = (root + iv) % 12 if which != "root" else bass
    return lo + (pc - lo) % 12


def place_melody(song, stem, notes, bar0, inst, gain=1.0, pan=0.0, legato=1.0, **kw):
    for b, beat, dur, m, v in notes:
        t = song.t(bar0 + b, beat)
        song.play(stem, inst(m, song.g.beats(dur) * legato, song.h.vel(v), **kw), t, pan, gain)


def strum(song, stem, inst, notes, t, dur, vel, roll=0.012, down=True, pan_spread=0.0, accent_top=0.0, **kw):
    order = notes if down else notes[::-1]
    k = len(order)
    for i, m in enumerate(order):
        pan = (i / max(1, k - 1) - 0.5) * pan_spread
        v = vel * (0.88 + 0.12 * np.random.default_rng(abs(int(t * 1000)) + i).random())
        if accent_top and m == max(notes):
            v *= 1 + accent_top
        song.play(stem, inst(m, max(0.05, dur - i * roll), min(1.0, v), **kw), t + i * roll, pan)


__all__ = ["bar_chords", "chord_at", "chords_by_beat", "phrase_chords", "chord_tone", "place_melody", "strum", "chord_pcs", "root_of"]
