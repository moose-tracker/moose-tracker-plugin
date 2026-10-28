# Moose Tracker plugin

Make game sound effects and retro synth songs by describing them. Your assistant writes the notes; **Moose Tracker's own synthesizer** plays them. Moose Tracker is a retro synthesizer and music tracker, **not an AI music model**.

**What you get (five tools)**
- `describe`: a short index of the song format, styles, sound-effect recipes, instrument presets, limits and examples.
- `sfx`: up to 16 sound effects per call as WAV files (28 recipes, or your own notes).
- `song`: checks a song and returns its length, tracks, cues, loop and warnings, plus a link that plays it in your browser. No audio is made.
- `render`: a song as Ogg Vorbis (default) or WAV, up to 3 minutes, with seamless-loop points, cues and stems.
- `convert`: moves a song between MTL text, a `.mtk` project file and a share link.

**Network and data (for reviewers)**
- Calls only `https://mcp.moosetracker.app/mcp` (MCP over HTTPS, stateless JSON-RPC). Audio download links point to the same host.
- **No sign-in, no API key, no credentials, no tracking code in the plugin.** The service keeps only anonymous daily totals (calls per tool, renders by format, errors, and counts of distinct and returning callers via a salted hash); never song text, prompts, IPs or identities (see the privacy page). The plugin has no hooks, scripts, commands or agents; it is one skill and one MCP server entry.
- We do not keep your song text. Rendered audio files are kept for about 2 hours (links stop working then; a storage rule removes any leftover after 1 day). Rate limits use a salted hash of the caller; no raw IP addresses or accounts are kept. See https://moosetracker.app/privacy.html.
- Free to use. Fair-use limits apply (per-minute, hourly and daily); over-limit calls get a polite "try again in N seconds" answer with the wait time.
- Formats are WAV and Ogg Vorbis (BSD-licensed libogg and libvorbis). There is no MP3 output.

**Install**
- Grok Build: `grok plugin install moose-tracker` once listed, or add the MCP server by hand (below).
- Manual MCP (Grok Build `config.toml`):
  ```toml
  [mcp_servers.moose-tracker]
  url = "https://mcp.moosetracker.app/mcp"
  ```
- grok.com / Grok app connectors: add a custom connector with the URL `https://mcp.moosetracker.app/mcp` (no authentication).

Contact: moose@moosetracker.app. © 2026 Kurtis Alexander. Terms: https://moosetracker.app/terms.html · Privacy: https://moosetracker.app/privacy.html · API & MCP terms: https://moosetracker.app/acceptable-use.html
