# Moose Tracker plugin

Make retro synth and chiptune songs by describing them. Your assistant writes the notes; **Moose Tracker's own synthesizer** plays them. Moose Tracker is a synthesizer and music tracker, **not an AI music model**: no recordings, no third-party music.

**What you get**
- `guide`, `list_presets`: the song format and the instrument list.
- `compose_song`, `edit_song`: check a song and get a link that plays it in your browser.
- `render_audio`: an Opus or WAV file (up to 3 minutes). Link works for 24 hours, then the file is deleted.
- `export_song`: a `.mtk` project file that opens in the web app at https://moosetracker.app.

**Network and data (for reviewers)**
- Calls only `https://mcp.moosetracker.app/mcp` (MCP over HTTPS, stateless JSON-RPC). The audio download links point to the same host.
- **No sign-in, no API key, no credentials, no telemetry.** The plugin has no hooks, scripts, commands, or agents; it is one skill and one MCP server entry.
- We do not keep your song text. The only thing kept is a rendered audio file, for about 24 hours, then it is deleted automatically. Rate limits use a salted hash of the caller; no raw IP addresses or accounts are kept. See https://moosetracker.app/privacy.html.
- Free to use. Fair-use limits apply (a few renders per hour per person); over-limit calls get a polite "try again in N minutes" and a browser link instead.

**Install**
- Grok Build: `grok plugin install moose-tracker` once listed, or add the MCP server by hand (below).
- Manual MCP (Grok Build `config.toml`):
  ```toml
  [mcp_servers.moose-tracker]
  url = "https://mcp.moosetracker.app/mcp"
  ```
- grok.com / Grok app connectors: add a custom connector with the URL `https://mcp.moosetracker.app/mcp` (no authentication).

Contact: moose@moosetracker.app. © 2026 Kurtis Alexander. Terms: https://moosetracker.app/terms.html · Privacy: https://moosetracker.app/privacy.html · API & MCP terms: https://moosetracker.app/acceptable-use.html
