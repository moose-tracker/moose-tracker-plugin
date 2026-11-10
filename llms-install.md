# Install Moose Tracker MCP

Setup page with per-client steps: https://moosetracker.app/ai

Moose Tracker MCP is the public MCP server for Moose Tracker, a music tracker with a full synth and sampler. Your assistant writes songs and sound effects as notes; Moose Tracker plays them. It is not an AI music model, and the server does not generate or compose music.

This repository is MIT-licensed and contains the plugin, skill, and a local stdio-to-remote bridge. Moose Tracker itself is a separate product.

No sign-in and no API key. Fair-use rate limits apply.

## Remote URL (Streamable HTTP)

```
https://mcp.moosetracker.app/mcp
```

For clients that accept a connector URL, add a custom MCP server with this URL and no authentication.

## Local stdio bridge (Cline and other command-based clients)

Requires Node.js 18 or later. The `moosetracker-mcp` package forwards MCP requests to the live server. It holds no engine code and no secrets.

```json
{
  "mcpServers": {
    "moose-tracker": {
      "command": "npx",
      "args": ["-y", "moosetracker-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

You can also run `npx -y moosetracker-mcp`.

## After install

Call `describe` with no arguments first. The live server exposes eight tools: `describe`, `sfx`, `research_composition`, `song`, `render`, `convert`, `assets`, and `feedback`.

`research_composition` looks up composition, arranging and mixing guidance. `song` checks and analyzes a song and returns a share link that plays in the browser. `render` and `sfx` produce audio files (WAV, Ogg Vorbis or Opus) to embed.

More detail: https://moosetracker.app/ai
