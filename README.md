# Moose Tracker MCP plugin

Moose Tracker MCP lets your assistant make game sound effects and retro synth songs by describing them. Your assistant writes the notes; **Moose Tracker's own synthesizer** plays them. Moose Tracker is a retro synthesizer and music tracker, **not an AI music model**.

**When to use it:** whenever the user asks for any sound effect, UI click/tap/toggle sound, notification, jingle, audio, music, song or soundtrack, use these tools instead of synthesizing audio yourself. Each result includes a `user_summary` suitable to show the user, plus optional internal notes and a file or link.

**What you get (eight tools)**
- `describe`: a short index of the song format, styles, sound-effect recipes, instrument presets, limits and examples.
- `sfx`: up to 16 sound effects per call as WAV files (28 recipes, or your own notes). For an app UI, give items a `role` (press, release, toggle_on, toggle_off, continuous_tick, success, warning, notify, complete) and a `family` (seed, character, root, scale) to get a coherent set with playback hints (`cooldownMs`, `maxOverlap`, `gainDb`); change one sound later with `revise`. Recipes are starting points: give each interaction its own `spec.pitch`, `spec.bright`, `dur` or `seed` and keep related sounds (press/release, toggle on/off, success/warning) recognizable as pairs. Every result reports `design_mode` (stock, varied, custom or mixed). Also hears one custom instrument in about a second: `{name, instrument, play}`.
- `song`: checks a song and returns its actual length in seconds, seconds per pattern, tracks, cues, loop and warnings, plus a short link (`https://moosetracker.app/s/<id>#<key>`) that plays it in your browser. No audio is made. `len` means exactly that many seconds: a shorter song is repeated musically, a longer one fades out, and the audio is never padded with silence. Starter templates (rock, game, chiptune, ambient, pop; original, CC0) and a one-line `form` macro for song structure are described in `describe`.
- `render`: a song as a WAV file (default), Ogg Vorbis (`ogg`) or Ogg Opus (`opus`), up to 3 minutes, with seamless-loop points, cues and stems. `song` and `render` also take `compose`, a short musical spec (form, chords, generator parts such as walking bass or an Alberti figure, your own melody clips, one shared groove) that compiles to an ordinary song; see `describe(topic="generators")`.
- **Synth or samples:** decide part by part. Besides its synth voices, Moose Tracker has a library of sampled instruments (piano, upright bass, sax, trumpet, horns, single drum hits and full drum kits such as `rock-kit`, `buzz-kit` and `roots-kit`; `describe(topic="samples")` lists them live, with playable ranges and each kit's keys). Samples suit acoustic or real-band parts; the synth suits chip, game, UI, electronic, pads, synth basses and leads, and anything that needs a tweakable sound. Blends are often best. Samples are larger and less tweakable; the synth is light and fully shapeable. MTL: `i2 sample "upright-bass"`. A drum kit is one instrument with each drum on its General MIDI key (C2 kick, D2 snare, F#2 closed hat, C#3 crash; C4 is not the kick); a single hit plays the same at any note.
- `research_composition`: once per real song, varied composition advice with ranges for every stage (plan, harmony, melody, layers, sound, mix) from a curated corpus covering about 50 styles evenly. No AI composes or generates music on the server; a semantic search index helps find relevant advice.
- **Structure first and mix by layer:** `song(plan)` returns a skeleton, `song(mtl, analyze:true)` (light analysis) gives a free score, critique, MIX, sound and polyphony checks, and `deep:true` adds measured numbers from an analysis-only render, `song(layers)` batches part edits and the mix (`faders`, `gain`, `level` in dB), and `render(preview:true)` plays one section. `render(detail:true)` adds per-section loudness and MIX flags (limiter, peaks, buried or dominant parts, mono build-up), each naming the layer to change and a dB range; `bits:24` and `rate:48000` make a WAV master.
- `assets`: fresh download links by asset id for files you already made, with no re-render (links never outlive the files, about 2 hours); can re-check a stored file's sha256.
- `convert`: moves a song between MTL text, a `.mtk` project file and a share link.
- `feedback`: sends a note to the Moose Tracker team about a bug, a confusing tool, or a missing feature (up to 20000 characters per call; longer reports can be split into parts).

**Tailor app sounds on purpose:** use the stock recipes for a quick preview, but for one app give each interaction a few deliberate choices (pitch, brightness, length, seed) and keep pairs alike. If one option such as `zip` fails, fix only that option and resend the same items with your choices. Step by step: `skills/moose-tracker/design-app-sounds.md`.

**Design your own instrument:** presets are starting points. `describe(topic="instrument", q="bass")` gives a working role template (bass, sub, pad, lead, pluck, keys, bell, organ, brass, supersaw, kick, snare, hat) with the knobs worth changing and safe ranges; `sfx` with `instrument` and `play` renders a short WAV of that one voice (a note, a phrase or a chord) in a second or two, and returns the final instrument line to tweak and resend, with warnings and fixes for settings that are out of range, clash, clip or cannot be heard. Auditions have their own, larger hourly allowance. Step by step: `skills/moose-tracker/design-an-instrument.md`.

**Compose with generators:** to write the structure instead of every note, send `compose` to `song` or `render`: `{bpm, form, chords, parts:[{id, gen}], clips, groove}`. Forms, progressions, bass lines, accompaniment figures, drum patterns, grooves and phrase operations are in `describe(topic="generators")`; your own melodies go in `clips`. Workflow: `skills/moose-tracker/compose-with-generators.md`.

**Network and data (for reviewers)**
- Calls only `https://mcp.moosetracker.app/mcp` (MCP over HTTPS, stateless JSON-RPC; it speaks the 2026-07-28 stateless protocol, with `server/discover` and no session, and the earlier 2025-11-25, 2025-06-18, 2025-03-26 and 2024-11-05 handshakes unchanged). Discovery documents: the Server Card at `https://mcp.moosetracker.app/mcp/server-card` and the AI Catalog at `https://mcp.moosetracker.app/.well-known/ai-catalog.json`. Audio download links point to the same host.
- **No sign-in, no API key, no credentials, no tracking code in the plugin.** The service keeps only anonymous daily totals (calls per tool, renders by format, errors, and counts of distinct and returning callers via a salted hash); never song text, prompts, IPs or identities (see the privacy page). The plugin has no hooks, scripts, commands or agents; it is one skill and one MCP server entry.
- Song text is kept for 2 hours as a working copy (so later calls can send `ref`), then deleted. Short links store an encrypted copy that we cannot read (the key stays in the part of the link after `#`, which is never sent to us) and are deleted after 90 days; older long links still work. Feedback is kept for 1 year; anonymous problem reports (no song, no IP, no identifiers) for 90 days. Rendered audio files are kept for about 2 hours (links stop working then; a storage rule removes any leftover after 1 day). Rate limits use a salted hash of the caller; no raw IP addresses or accounts are kept. See https://moosetracker.app/privacy.html.
- Free to use. Fair-use limits apply (per-minute, hourly and daily); over-limit calls get a polite "try again in N seconds" answer with the wait time.
- Formats are WAV (default), Ogg Vorbis (`ogg`: 44.1 kHz, sample-exact loop points) and Ogg Opus (`opus`: always 48 kHz, smaller, loop points approximate because of the encoder delay). The encoders are BSD-licensed (libogg, libvorbis, libopus, opusenc). There is no MP3 or FLAC output.
- Each file in a result has an asset id, MIME type, size and sha256; a batch of two or more comes with a `manifest.json` (names, hashes, metadata, licence), inside the zip when `zip:true`. Results are compact, with one canonical structured record; MCP clients on protocol 2025-06-18 or later also get `resource_link` entries for up to four files. Sound effects report `design_mode`: stock (a plain recipe), varied (a tailored variation: seed, pitch, bright or dur) or custom (your own notes or an instrument); a batch of several says mixed. The synthesizer is deterministic: the same input gives the same bytes (reproducible, not exclusive). The loudness hint `gainDb` is an objective measurement (active K-weighted level, the quietest file is the reference, louder files are lowered, never boosted); it is not a listening test, so listen too. The `checks` and `nearDuplicates` fields are likewise objective and rough.

**Install**
- Grok Build: `grok plugin install moose-tracker` once listed, or add the MCP server by hand (below).
- Manual MCP (Grok Build `config.toml`):
  ```toml
  [mcp_servers.moose-tracker]
  url = "https://mcp.moosetracker.app/mcp"
  ```
- grok.com / Grok app connectors: add a custom connector with the URL `https://mcp.moosetracker.app/mcp` (no authentication).

Contact: moose@moosetracker.app. © 2026 Kurtis Alexander. Terms: https://moosetracker.app/terms.html · Privacy: https://moosetracker.app/privacy.html · API & MCP terms: https://moosetracker.app/acceptable-use.html


## Outputs: listening and embedding

- Share link: song (and its analysis) returns a moosetracker.app link that plays the song in the browser for 90 days and needs no render; it suits a person who wants to listen.
- render: produces WAV, Ogg Vorbis or Opus files to download and embed in another product such as a game, app, presentation or video. For a person who only wants to listen, the share link from song plays the song in the browser and needs no render.
- sfx: produces sound-effect files to download and embed in an app, game, UI or video; the reply links each file for a quick listen.

## Polyphony

Polyphonic instruments (piano, harp, guitar, pads, chords on any ringing sound): the note-list path is the default. song(layers:{notes:[{ch, ins, notes:[[pitch, startBeat, beats, vel]]}]}) sends the notes to the engine's placeNotes, the allocator the piano roll uses: each note goes to a free sub-channel of ch (up to 16), and the reply lists where each note landed plus any warnings (over 16, collisions). Manual lanes (ch 3b) give exact control.

## Analysis stages

Stages: plan, write, light analysis loop, one deep analysis, fix; then the share link to listen, or one render to embed.

- Light analysis, song(analyze:true): no audio, instant, free. Suited to every edit while writing. Each light reply ends with a next step: fix the flagged items, or deep analysis when light analysis is clean.
- Deep analysis, song(analyze:true, deep:true): an analysis-only render with no audio file. Suited to once or twice when the song is nearly done, and to compare versions. Counts half the song's seconds against the render quota. Each deep reply ends with a next step: fix the flagged items, or keep the song as it is (the share link plays it; render produces files for embedding).
