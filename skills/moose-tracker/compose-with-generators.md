# Workflow: compose with generators via MCP

Use this when the user wants a whole piece (a game loop, a blues, a waltz, a march) and you would rather choose the structure than type every row. `compose` replaces `mtl` on `song` and `render`. It compiles to an ordinary MTL song, so the engine, the checks and the determinism are the same as for a hand-written song.

## 1. Look up what exists (one call)

`describe(topic="generators")` lists forms, progressions, bass lines, accompaniment figures, drums, grooves and phrase operations, with one working spec. Look closer with `q="bass.walking"` (parameters and a working spec), `q="drums"` (a category) or a word (`q="waltz"`, `q="broken chord"`). A miss says "No generator matches" and lists related entries; it never substitutes a default.

## 2. Write the spec

```
song { compose: {
  name: "Blue Hour", bpm: 84, form: "blues12", key: "E", groove: "shuffle",
  parts: [ { id: "bass", gen: "bass.walking", oct: 2 },
           { id: "keys", gen: "acc.stabs", inst: "@arp", opt: { voicing: "shell" } },
           { id: "kit",  gen: "drum.shuffle", opt: { fill: "snare" } } ],
  clips: [ { part: "lead", notes: "1 . 3 . 5 . 6 . b7 . . . . . . .", domain: "degree", unit: "8th", at: 1 } ] } }
```

- **Time:** `bpm` is quarter notes (use `pulse:"dotted-quarter"` for 6/8 tempos); `meter` defaults to 4/4; odd meters take `grouping:"2+2+3"`. The tempo must come out as a whole quarter-note BPM (32-255); the error tells you.
- **Harmony:** `chords:"C Am F G"` (one per bar; `"G,Am7"` splits a bar; `F*2` is two bars) or `progression:"pop4"` with `key`. Contrasting sections take `alt`. `override:[{bar, chord}]` changes single bars; `ending:"tonic"` closes on the tonic.
- **Parts:** each `{id, gen}` is a generator from the catalog. `opt` sets its options (unknown options are errors that list the valid ones). `bars:[a,b]` limits a part; `rest:[[a,b]]` silences bars; `duck:"lead"` silences a part under a clip.
- **Your own notes:** `clips` place a melody at a bar (`at`, `beat`, `pickup`), in note names (`C5`), scale degrees (`1 b3 5+`) or chord degrees (`1 3 5 7`), with `ops` such as `transpose:+2`, `invert`, `retro`, `aug`, `dim`, `sequence:3:+2`. Clips on one part may not overlap.
- **Groove:** one per song. Written parts get it once; a clip marked `timing:"performed"` is never swung again. MTL swing is a whole percent: `shuffle` is 67%, which puts the off-beat about 2 ms from a perfect 2:1; the plan reports the difference.
- **Limits:** 16 tracks (chord parts use 3 or 4, drums one per slot), 128 bars, 180 seconds. Too many tracks lists each part's count.

## 3. Check, then render

`song` returns the plan: bars, seconds, chord map, parts with their track numbers, groove and the loop join (`G → C (V → I)` with `loop:true`). Send `return:"mtl"` for the compiled song, or `compose.inspect:{part:"bass", bars:[1,2]}` for one part's rows. Fix the spec, not the compiled text: the compiled song is regenerated on every call and nothing is stored.

`render` takes the same `compose` plus the usual `format` (wav default, ogg, opus), `loop`, `len`, `stems`.

## Notes

- Same spec and seed give the same song; a generator's output does not change within its catalog version (`ver`). `seed` changes the seeded choices (approach notes, fills, humanising).
- Humanising skips chord parts: independent jitter would roll the chord.
- Anything the catalog cannot say, write as MTL or as a clip.
