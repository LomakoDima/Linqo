"""Harmony, rhythm and melody helpers shared by every song."""

import math

import numpy as np

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

QUAL = {
    "": [0, 4, 7],
    "m": [0, 3, 7],
    "5": [0, 7],
    "maj7": [0, 4, 7, 11],
    "maj9": [0, 4, 7, 11, 14],
    "maj7#11": [0, 4, 7, 11, 18],
    "m7": [0, 3, 7, 10],
    "m9": [0, 3, 7, 10, 14],
    "m11": [0, 3, 7, 10, 14, 17],
    "m6": [0, 3, 7, 9],
    "mmaj7": [0, 3, 7, 11],
    "madd9": [0, 3, 7, 14],
    "7": [0, 4, 7, 10],
    "9": [0, 4, 7, 10, 14],
    "13": [0, 4, 10, 14, 21],
    "7b9": [0, 4, 7, 10, 13],
    "7#9": [0, 4, 7, 10, 15],
    "7sus4": [0, 5, 7, 10],
    "9sus4": [0, 5, 7, 10, 14],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
    "add9": [0, 4, 7, 14],
    "6": [0, 4, 7, 9],
    "69": [0, 4, 7, 9, 14],
    "m7b5": [0, 3, 6, 10],
    "dim7": [0, 3, 6, 9],
}

SCALES = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "pent": [0, 2, 4, 7, 9],
    "mpent": [0, 3, 5, 7, 10],
    "harmonic": [0, 2, 3, 5, 7, 8, 11],
}


def note_pc(name):
    pc = PC[name[0]]
    for ch in name[1:]:
        pc += 1 if ch == "#" else -1 if ch == "b" else 0
    return pc % 12


def parse(sym):
    """'Ebmaj9/G' -> (root_pc, intervals, bass_pc)."""
    bass = None
    if "/" in sym:
        sym, b = sym.split("/")
        bass = note_pc(b)
    i = 2 if len(sym) > 1 and sym[1] in "#b" else 1
    root = note_pc(sym[:i])
    return root, QUAL[sym[i:]], root if bass is None else bass


def chord_pcs(sym, ext=True):
    root, ivs, _ = parse(sym)
    if not ext:
        ivs = [i for i in ivs if i < 12]
    return sorted({(root + i) % 12 for i in ivs})


def root_of(sym, lo=36):
    """Bass note (slash bass respected) at or above `lo`."""
    _, _, bass = parse(sym)
    return lo + (bass - lo) % 12


def nearest(pc, target):
    """Midi note with pitch class `pc` nearest to `target`."""
    base = target - (target - pc) % 12
    return base if target - base <= 6 else base + 12


def voice(sym, prev=None, lo=55, hi=77, rootless=False, drop=False, max_notes=5):
    """Pick a voicing in [lo, hi] that moves as little as possible from prev."""
    root, ivs, _ = parse(sym)
    tones = list(ivs)
    if rootless and len(tones) >= 4:
        tones = [i for i in tones if i != 0]
        if len(tones) > 4 and 7 in tones:
            tones.remove(7)
    while len(tones) > max_notes:
        tones.remove(7) if 7 in tones else tones.pop()
    pcs = [(root + i) % 12 for i in tones]
    cands = []
    for inv in range(len(pcs)):
        order = pcs[inv:] + pcs[:inv]
        for start in range(lo - 12, hi):
            if start % 12 != order[0]:
                continue
            notes = [start]
            for pc in order[1:]:
                nxt = notes[-1] + 1
                while nxt % 12 != pc:
                    nxt += 1
                notes.append(nxt)
            variants = [notes]
            if drop and len(notes) >= 4:
                d2 = sorted(notes[:-2] + [notes[-2] - 12] + notes[-1:])
                variants.append(d2)
            for v in variants:
                if v[0] >= lo and v[-1] <= hi:
                    cands.append(v)
    if not cands:
        return voice(sym, prev, lo - 3, hi + 3, rootless, drop, max_notes)
    center = (lo + hi) / 2

    def cost(v):
        c = abs(np.mean(v) - center) * 0.35
        if prev:
            c += sum(min(abs(x - p) for p in prev) for x in v) + sum(min(abs(p - x) for x in v) for p in prev)
        return c

    return min(cands, key=cost)


def scale_notes(key_pc, mode, lo, hi):
    s = SCALES[mode]
    return [n for n in range(lo, hi + 1) if (n - key_pc) % 12 in s]


class Grid:
    """Bars/beats -> seconds, with continuous swing on 8ths or 16ths."""

    def __init__(self, bpm, bars, bpb=4, swing=0.0, swing_unit=0.5):
        self.bpm = bpm
        self.spb = 60.0 / bpm
        self.bars = bars
        self.bpb = bpb
        self.swing = swing
        self.u = swing_unit

    @property
    def length(self):
        return self.bars * self.bpb * self.spb

    @property
    def bar_len(self):
        return self.bpb * self.spb

    def warp(self, beat):
        if not self.swing:
            return beat
        u = self.u
        pair = math.floor(beat / (2 * u))
        pos = beat - pair * 2 * u
        s = self.swing * u / 3.0
        if pos < u:
            w = pos * (u + s) / u
        else:
            w = u + s + (pos - u) * (u - s) / u
        return pair * 2 * u + w

    def t(self, bar, beat=0.0):
        return (bar * self.bpb + self.warp(beat)) * self.spb

    def beats(self, beats):
        return beats * self.spb


class Human:
    def __init__(self, seed, ms=7.0, vel=0.08):
        self.rng = np.random.default_rng(seed)
        self.ms = ms
        self.v = vel

    def t(self, t):
        return t + self.rng.normal(0, self.ms / 1000.0)

    def vel(self, v):
        return float(np.clip(v * (1 + self.rng.normal(0, self.v)), 0.05, 1.0))


# ------------------------------------------------------------- melody


def _snap(note, pcs, direction=0):
    for d in (0, 1, -1, 2, -2, 3, -3):
        dd = d if direction >= 0 else -d
        if (note + dd) % 12 in pcs:
            return note + dd
    return note


def _step(note, steps, scale):
    if note not in scale:
        note = min(scale, key=lambda s: abs(s - note))
    i = scale.index(note) + steps
    i = max(0, min(len(scale) - 1, i))
    return scale[i]


def melody(rng, chords, key_pc, mode, lo, hi, rhythms, cadence, final=True, bpb=4, ext=True):
    """Motif-driven phrase over len(chords) bars.

    chords: per bar, a symbol or a list of (beat, symbol). The motif (a
    rhythm plus a small scale-step ornament per note) states in bar 1,
    sequences onto bar 2's chord, varies in bar 3, and the last bar takes
    the cadence rhythm. Pitches follow an arch: chord tones (in-key
    extensions allowed) on strong beats and long notes, scale passing
    tones between. final=False ends on the 3rd/5th (a "question"),
    final=True on the root (the "answer"). The same rng seed over new
    chords gives the same tune re-harmonised. Returns
    [(bar, beat, dur, midi, vel)].
    """
    scale = scale_notes(key_pc, mode, lo - 12, hi + 12)
    in_key = {(key_pc + i) % 12 for i in SCALES[mode]}
    bars = [[(0.0, c)] if isinstance(c, str) else c for c in chords]
    nbars = len(bars)
    total = nbars * bpb

    def sym_at(b, beat):
        cur = bars[b][0][1]
        for bb, sy in bars[b]:
            if bb <= beat + 1e-9:
                cur = sy
        return cur

    def tones(sym, core_only=False):
        core = chord_pcs(sym, False)
        if core_only or not ext:
            return core
        return sorted(set(core) | {pc for pc in chord_pcs(sym, True) if pc in in_key})

    motif_r = rhythms[rng.integers(len(rhythms))]
    alt_r = rhythms[rng.integers(len(rhythms))]
    orn = [int(v) for v in rng.choice([-1, 0, 0, 1, 1, 2], len(motif_r))]
    peak = rng.uniform(0.4, 0.68)
    amp = rng.uniform(4.0, 7.0)
    base = lo + (hi - lo) * rng.uniform(0.3, 0.45)

    events = []
    for b in range(nbars):
        r = cadence if b == nbars - 1 else alt_r if (b % 4 == 2 and nbars >= 4) else motif_r
        changes = [bb for bb, _ in bars[b] if bb > 0]
        for j, (beat, dur) in enumerate(r):
            # never hold a note across a chord change in the cadence bar
            cut = next((c for c in changes if beat < c < beat + dur - 1e-6), None)
            if b == nbars - 1 and cut is not None:
                events.append((b, beat, cut - beat, j, r is motif_r))
                events.append((b, cut, beat + dur - cut, j, False))
            else:
                events.append((b, beat, dur, j, r is motif_r))

    out = []
    prev = None
    repeats = 0
    for k, (b, beat, dur, j, is_motif) in enumerate(events):
        pos = (b * bpb + beat) / total
        if pos < peak:
            target = base + amp * math.sin(0.5 * math.pi * pos / peak)
        else:
            target = base + amp * math.cos(0.5 * math.pi * (pos - peak) / (1 - peak)) - 2.0
        sym = sym_at(b, beat)
        last = k == len(events) - 1
        strong = (abs(beat - round(beat)) < 1e-6 and int(round(beat)) % 2 == 0) or dur >= 1.0 or j == 0
        if last:
            root, ivs, _ = parse(sym)
            want = [root] if final else [(root + ivs[1]) % 12, (root + 7) % 12]
            note = min((nearest(pc, prev if prev else target) for pc in want), key=lambda n: abs(n - (prev or target)))
        elif strong or prev is None:
            cands = [n for n in range(lo, hi + 1) if n % 12 in tones(sym)]
            ref = target if prev is None else 0.55 * target + 0.45 * prev

            def score(n):
                sc = abs(n - ref)
                if prev is not None:
                    sc += 2.5 * max(0, abs(n - prev) - 5)
                    sc += 2.0 if n == prev and repeats >= 1 else 0
                return sc

            note = min(cands, key=score)
        else:
            direction = 1 if target > prev else -1
            if rng.random() < 0.25:
                direction = -direction
            step = direction * (2 if rng.random() < 0.2 else 1)
            if is_motif:
                step += orn[j % len(orn)] * (1 if direction > 0 else -1) // 2
            if step == 0:
                step = direction
            note = _step(prev, step, scale)
        while note > hi:
            note -= 12
        while note < lo:
            note += 12
        repeats = repeats + 1 if note == prev else 0
        prev = note
        v = 0.6 + (0.12 if strong else 0.0) + rng.normal(0, 0.04)
        out.append((b, beat, dur, note, float(np.clip(v, 0.3, 0.95))))
    return out


def bebop_line(rng, chords_by_beat, lo, hi, start, rest_prob=0.3, swing_feel=True):
    """Swung-8th improvised line: chord tones on beats, passing/chromatic
    tones between, chromatic approach into each new chord, phrases that
    breathe (rests). chords_by_beat: list of (bar, beat, sym) per quarter."""
    out = []
    note = start
    playing = True
    direction = 1
    left = int(rng.integers(5, 11))
    for idx, (bar, beat, sym) in enumerate(chords_by_beat):
        if left <= 0:
            playing = not playing
            left = int(rng.integers(3, 7)) if not playing else int(rng.integers(6, 13))
        left -= 1
        if not playing:
            continue
        pcs = chord_pcs(sym)
        nxt = chords_by_beat[idx + 1][2] if idx + 1 < len(chords_by_beat) else sym
        for half in (0.0, 0.5):
            if half == 0.0:
                note = _snap(note + direction * int(rng.choice([1, 2, 3])), pcs, direction)
            else:
                if nxt != sym and rng.random() < 0.6:
                    target = _snap(note + direction * 2, chord_pcs(nxt), direction)
                    note = target - direction
                else:
                    note += direction * int(rng.choice([1, 2]))
            if note > hi:
                direction = -1
                note -= 3
            elif note < lo:
                direction = 1
                note += 3
            if rng.random() < 0.12:
                direction = -direction
            vel = 0.58 + (0.14 if half == 0.5 else 0.0) + rng.normal(0, 0.05)
            out.append((bar, beat + half, 0.48, note, float(np.clip(vel, 0.3, 0.9))))
    return out


def walking_bass(rng, chords_by_beat, lo=31, hi=50):
    """Quarter-note walking line: root on chord changes, chord/scale tones
    in between, chromatic approach on the beat before each change."""
    out = []
    note = root_of(chords_by_beat[0][2], lo + 2)
    for i, (bar, beat, sym) in enumerate(chords_by_beat):
        prev_sym = chords_by_beat[i - 1][2] if i > 0 else None
        nxt_sym = chords_by_beat[(i + 1) % len(chords_by_beat)][2]
        root = parse(sym)[2]
        if sym != prev_sym:
            note = nearest(root, note)
        elif nxt_sym != sym:
            target = nearest(parse(nxt_sym)[2], note)
            note = target + (1 if rng.random() < 0.5 else -1)
        else:
            pcs = chord_pcs(sym, False)
            cands = [n for n in range(note - 5, note + 6) if n % 12 in pcs and n != note]
            note = int(rng.choice(cands)) if cands else note
        while note < lo:
            note += 12
        while note > hi:
            note -= 12
        out.append((bar, beat, 0.95, note, 0.7 + (0.1 if beat == 0 else 0) + rng.normal(0, 0.04)))
    return out


# ------------------------------------------------------------- guitar

GUITAR_OPEN = [40, 45, 50, 55, 59, 64]

# fret per string (low E -> high e); None = not played
SHAPES = {
    "G": [3, 2, 0, 0, 3, 3],
    "G6": [3, 2, 0, 0, 0, 0],
    "Gmaj7": [3, None, 0, 0, 0, 2],
    "Cadd9": [None, 3, 2, 0, 3, 3],
    "C": [None, 3, 2, 0, 1, 0],
    "Cmaj7": [None, 3, 2, 0, 0, 0],
    "Em": [0, 2, 2, 0, 0, 0],
    "Em7": [0, 2, 2, 0, 3, 3],
    "D": [None, None, 0, 2, 3, 2],
    "Dsus4": [None, None, 0, 2, 3, 3],
    "Dsus2": [None, None, 0, 2, 3, 0],
    "D/F#": [2, None, 0, 2, 3, 2],
    "A": [None, 0, 2, 2, 2, 0],
    "A/C#": [None, 4, 2, 2, 2, 0],
    "Asus2": [None, 0, 2, 2, 0, 0],
    "Bm7": [None, 2, 4, 2, 3, 2],
    "Bm": [None, 2, 4, 4, 3, 2],
    "Am": [None, 0, 2, 2, 1, 0],
    "Am7": [None, 0, 2, 0, 1, 0],
    "F": [1, 3, 3, 2, 1, 1],
    "Fmaj7": [None, None, 3, 2, 1, 0],
    "E7": [0, 2, 0, 1, 0, 0],
    "E": [0, 2, 2, 1, 0, 0],
    "Dm": [None, None, 0, 2, 3, 1],
    "F#m": [2, 4, 4, 2, 2, 2],
    "Esus4": [0, 2, 2, 2, 0, 0],
}


def shape_notes(name):
    return [GUITAR_OPEN[i] + f for i, f in enumerate(SHAPES[name]) if f is not None]
