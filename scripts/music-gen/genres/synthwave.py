"""Synthwave: punchy kick, gated-reverb snare, pumping 8th-note saw bass,
wide supersaw pads, a 16th arpeggio through a dotted-8th delay, and a
gliding, vibrato'd lead."""

import numpy as np

import instruments as I
from common import chord_at, chord_tone, phrase_chords
from engine import SR, chorus, eq, make_ir, saturate
from song import Song
from theory import melody, note_pc, voice

RHYTHMS = [
    [(0.0, 1.5), (1.5, 1.0), (2.5, 1.5)],
    [(0.0, 0.5), (0.5, 0.5), (1.0, 1.0), (2.0, 2.0)],
    [(0.0, 2.0), (2.0, 0.5), (2.5, 0.5), (3.0, 1.0)],
    [(0.5, 1.0), (1.5, 0.5), (2.0, 2.0)],
]
CADENCE = [(0.0, 1.0), (1.0, 3.0)]

TRACKS = [
    dict(slug="neon-skyline", title="Neon Skyline", bpm=100, key="A", mode="minor", prog=["Am", "F", "C", "G", "Am", "F", "Dm", "Esus4"], four=False, seed=701),
    dict(slug="night-runner", title="Night Runner", bpm=112, key="F", mode="minor", prog=["Fm", "Db", "Ab", "Eb", "Fm", "Db", "Bbm", "Csus4"], four=True, seed=713),
    dict(slug="chrome-hearts", title="Chrome Hearts", bpm=96, key="E", mode="minor", prog=["Em", "Cmaj7", "G", "D", "Em", "Cmaj7", "Am7", "Bsus4"], four=False, seed=727),
]

ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 4, 3, 2, 1]


def gated_ir(length=0.28, seed=0):
    rng = np.random.default_rng(seed)
    n = int((length + 0.03) * SR)
    t = np.arange(n) / SR
    env = np.where(t < length, 1.0 - 0.3 * t / length, np.exp(-(t - length) / 0.006) * 0.7)
    env *= 1 - np.exp(-t / 0.004)
    ir = eq(rng.standard_normal((2, n)), ("lp", 7000.0), ("hp", 300.0), periodic=False) * env
    return ir / np.sqrt(np.sum(ir**2) / 2) * 0.5


def build(cfg):
    bars = 32
    s = Song(cfg["bpm"], bars, seed=cfg["seed"])
    s.h.ms = 2.0
    s.h.v = 0.04
    rng = np.random.default_rng(cfg["seed"])
    prog = cfg["prog"]
    key = note_pc(cfg["key"])
    bl = s.g.bar_len
    brk = range(20, 24)

    prev = None
    for bar in range(bars):
        sym = chord_at(prog, bar, 0)
        notes = voice(sym, prev, 52, 74, max_notes=4)
        prev = notes
        cut = 1300 if bar < 4 or bar in brk else 2300
        for m in notes:
            s.play("pad", I.pad(m, bl, 0.5, cutoff=cut, a=0.25, r=0.9, detune=16, voices=7, lfo_cut=0.15, seed=bar), s.t(bar, 0, human=False))

        arp_notes = voice(sym, None, 64, 84, max_notes=4)
        arp_notes = arp_notes + [arp_notes[0] + 12]
        for i in range(16):
            m = arp_notes[ARP[i] % len(arp_notes)]
            x = I.synth(m, s.g.beats(0.2), 0.5 if i % 4 == 0 else 0.4, shape=1, pw=0.4, cutoff=900 if bar < 4 else 1400, env_amt=2600, env_tau=0.05, res=0.3, a=0.001, d=0.1, s=0.0, r=0.08, seed=i)
            s.play("arp", x, s.t(bar, i * 0.25), pan=0.35 if i % 2 else -0.35)

    for bar in range(4, bars):
        if bar in brk:
            continue
        sym = chord_at(prog, bar, 0)
        root = chord_tone(sym, "root", 33)
        for i in range(8):
            m = root + 12 if (i == 7 and bar % 2) else root
            x = I.synth(m, s.g.beats(0.42), 0.85, shape=0, voices=2, detune=6, cutoff=220, env_amt=1100, env_tau=0.08, res=0.25, a=0.002, d=0.2, s=0.6, r=0.05, sub=0.55, key_track=0.0)
            s.play("bass", x, s.t(bar, i * 0.5))

    # drums
    for bar in range(4, bars):
        if bar in brk:
            if bar == 23:
                for i in range(8):
                    s.play("snare", I.snare("synth", i % 3), s.t(bar, 2.0 + i * 0.25), gain=0.3 + 0.07 * i)
            continue
        kicks = [0.0, 1.0, 2.0, 3.0] if cfg["four"] else [0.0, 2.0, 2.5]
        for kb in kicks:
            s.kick("kick", I.kick("synth", int(rng.integers(3))), s.t(bar, kb), gain=0.9)
        for sb in (1.0, 3.0):
            s.play("snare", I.snare("synth", int(rng.integers(3))), s.t(bar, sb), gain=0.8)
        for i in range(16):
            s.play("hats", I.hat(False, i % 3), s.t(bar, i * 0.25), pan=0.25, gain=(0.42, 0.22, 0.32, 0.22)[i % 4])
        if cfg["four"]:
            for ob in (0.5, 1.5, 2.5, 3.5):
                s.play("hats", I.hat(True, 1), s.t(bar, ob), pan=0.25, gain=0.25)
        if bar % 8 == 3 or bar == bars - 1:
            for i, m in enumerate((50, 47, 43, 40)):
                s.play("toms", I.tom(m, i % 2), s.t(bar, 3.0 + i * 0.25), pan=0.4 - 0.27 * i, gain=0.7)
        if bar in (4, 12, 24):
            s.play("crash", I.crash(bar % 2), s.t(bar, 0), pan=-0.3, gain=0.9)

    # lead
    plan = [(12, 0, False), (16, 0, True), (24, 1, False), (28, 1, True)]
    for bar0, which, final in plan:
        notes = melody(np.random.default_rng(cfg["seed"] + which * 7), phrase_chords(prog, bar0, 4), key, cfg["mode"], 64, 83, RHYTHMS, CADENCE, final=final)
        last = None
        for b, beat, dur, m, v in notes:
            glide = last if last is not None and abs(last - m) <= 5 and rng.random() < 0.5 else None
            x = I.synth(m, s.g.beats(dur) * 0.96, 0.75, shape=0, voices=3, detune=9, cutoff=2400, env_amt=1800, env_tau=0.25, res=0.2, a=0.008, d=0.4, s=0.8, r=0.25, vib=0.0045, vib_rate=5.5, vib_delay=0.25, stereo=True, glide_from=glide, glide_t=0.04, seed=b)
            s.play("lead", x, s.t(bar0 + b, beat))
            last = m

    hall = make_ir(2.8, predelay=0.03, damping=0.45, size=1.3, seed=cfg["seed"], width=1.2)
    gate = gated_ir(seed=cfg["seed"])
    spec = {
        "pad": dict(db=1.0, eq=[("hp", 200.0), ("peak", 500.0, -2.0, 0.8)], fx=[lambda x: chorus(x, 0.4, 3.0, mix=0.4)], rev={"hall": 0.35}, sc=0.45, width=1.4),
        "arp": dict(db=-4.0, eq=[("hp", 300.0)], rev={"hall": 0.2}, dly=0.35, sc=0.25),
        "bass": dict(db=-4.0, eq=[("hp", 35.0), ("lp", 2500.0)], fx=[lambda x: saturate(x, 1.4)], sc=0.55),
        "kick": dict(db=-10.0, eq=[("hp", 35.0), ("peak", 60.0, 2.0, 1.2)]),
        "snare": dict(db=-2.0, eq=[("hp", 150.0), ("peak", 200.0, 2.0, 1.0)], rev={"gate": 0.8, "hall": 0.1}),
        "hats": dict(db=7.0, eq=[("hp", 6000.0)], rev={"hall": 0.05}),
        "toms": dict(db=-2.0, rev={"gate": 0.4, "hall": 0.15}),
        "crash": dict(db=-6.0, rev={"hall": 0.2}),
        "lead": dict(db=5.0, eq=[("hp", 200.0), ("peak", 2500.0, 1.5, 1.0)], fx=[lambda x: chorus(x, 0.8, 2.0, mix=0.35)], rev={"hall": 0.3}, dly=0.3),
    }
    return s.mix(
        spec,
        irs={"hall": hall, "gate": gate},
        delay=dict(time=s.g.beats(0.75), fb=0.4, tone=4000.0, to_rev=0.25),
        master_fx=[lambda x: saturate(x * 1.1, 1.2) / 1.1],
        target=-15.0,
    )
