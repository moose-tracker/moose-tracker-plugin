# Workflow: design a custom instrument via MCP

Use this when no preset sounds right. Presets are starting points; Moose Tracker's synth has about 90 fields, and a good voice is usually a template plus two or three changes. Everything below is one `describe` call and a few short `sfx` calls.

## 1. Pick a role template

`describe(topic="instrument", q="<role>")`. Roles: bass, sub (808), pad, lead, pluck, keys (e-piano), bell, organ, brass, supersaw, kick, snare, hat. Aliases work (`epiano`, `808`, `hi-hat`, `drums`). Each template gives:
- a working line (the text after `iN`), already tested to be audible and not clip;
- a `play` phrase that shows the voice off;
- the knobs worth changing, with safe ranges and what each does;
- one tip.

## 2. Hear it in about a second

```
sfx items=[{ name: "bass1", instrument: "- wave=saw vol=50 a=2 d=250 s=70 r=90 cutoff=45 reso=25 fenv=40 fd=180 sub=60", play: "C2 . E2 G2" }]
```

`play` is notes separated by spaces: `C3` (alone it holds one second), `C3 E3 G3` (one beat each, 0.25 s), `C3+E3+G3` (a chord, up to 4 notes), `C3:4` (4 beats), `.` (rest). Up to 24 beats. Eb4 and F#2 are fine. The result is a short mono WAV. No song is needed.

Compare several versions at once: send up to 16 items in one call, each with its own `instrument`. Auditions are cheap: they have their own hourly allowance (see `describe(topic="limits")`), separate from song renders.

## 3. Read the reply, tweak, resend

The reply has `instruments` (item name to the final line, with out-of-range values already clamped) and `warnings`. Each warning says what is wrong and the fix. Typical ones:
- a value outside its range (it is clamped; use the stated value);
- clashing settings (a high-pass at or above the low-pass cutoff, oscillator-2 settings with `wave2=off`, unison settings with `uni=1`, a filter envelope when the cutoff is already at 100);
- inaudible or overloaded sound (`vol=0`, `cutoff` near 1, very high `drive` with high `vol`, very high `reso`), and measured problems after the render (nearly inaudible, clipped samples, squashed, slow start).

Unknown field names and wrong types are errors and nothing is rendered; the error suggests the nearest real name.

Change one or two values per round (cutoff, attack, decay, `sub`, `uni_det`, `rev`) and resend the line you got back. The same line gives the same sound.

## 4. Use it in a song

Put the line in the song: `i1 - wave=saw ... ` (or `i1 "Warm Pad" cutoff=40` to start from a preset), use `1 i1: C2 . E2 G2` on a track, then `song` to check and `render`. `song` and `render` replies list the voices they used (`voices`) with the same warnings, so you can adjust without a separate audition.

## Notes
- Determinism: the same line and notes always produce the same bytes. That is reproducibility, not a promise that a sound is unique.
- `ogg` output from `render` is Ogg Vorbis and `opus` is Ogg Opus (48 kHz); auditions are WAV.
- Loudness: the audition is peak-normalised, so listen for balance in the song, not in the audition. `warnings` flags a voice that is very quiet before normalising, which means it will be buried in a mix.
