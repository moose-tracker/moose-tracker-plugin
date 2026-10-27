# Moose Tracker plugin

Make retro synth and chiptune songs by describing them. Your assistant writes the notes; **Moose Tracker's own synthesizer** plays them. Moose Tracker is a synthesizer and music tracker, **not an AI music model**: no recordings, no third-party music.

**What you get**
- `guide`, `list_presets`: the song format and the instrument list.
- `compose_song`, `edit_song`: check a song and get a link that plays it in your browser.
- `render_audio`: an Ogg Vorbis file (default for music) or a WAV file (default for sound effects; ask for WAV any time), up to 3 minutes. Link works for about 2 hours, then the file is deleted (re-render if a link has expired).
- `export_song`: a `.mtk` project file that opens in the web app at https://moosetracker.app.

**Network and data (for reviewers)**
- Calls only `https://mcp.moosetracker.app/mcp` (MCP over HTTPS, stateless JSON-RPC). The audio download links point to the same host.
- **No sign-in, no API key, no credentials, no telemetry.** The plugin has no hooks, scripts, commands, or agents; it is one skill and one MCP server entry.
- We do not keep your song text. The only thing kept is a rendered audio file, for about 2 hours (re-render if a link has expired), then it is deleted automatically. Rate limits use a salted hash of the caller; no raw IP addresses or accounts are kept. See https://moosetracker.app/privacy.html.
- Free to use. Fair-use limits apply (a few renders per hour per person); over-limit calls get a polite "try again in N minutes" and a browser link instead.

**Install**
- Grok Build: `grok plugin install moose-tracker` once listed, or add the MCP server by hand (below).
- Manual MCP (Grok Build `config.toml`):
  ```toml
  [mcp_servers.moose-tracker]
  url = "https://mcp.moosetracker.app/mcp"
  ```
- grok.com / Grok app connectors: add a custom connector with the URL `https://mcp.moosetracker.app/mcp` (no authentication).

**License scope:** the MIT license (see `LICENSE`) applies to the files in this plugin repository only (the manifest, the skill text, the MCP connection file and this README). The Moose Tracker service and web app are proprietary and governed by https://moosetracker.app/terms.html. The Moose Tracker name and logo (including the files in `assets/`) are not licensed by MIT; they may be used only to identify this plugin and the service, as described in the Terms.

Contact: moose@moosetracker.app. © 2026 Kurtis Alexander. Terms: https://moosetracker.app/terms.html · Privacy: https://moosetracker.app/privacy.html · API & MCP terms: https://moosetracker.app/acceptable-use.html
