# moosetracker-mcp

This package is the local stdio-to-remote bridge only. The product and setup pages are at https://moosetracker.app/ and https://moosetracker.app/ai.

A small local stdio-to-remote bridge for the [Moose Tracker](https://moosetracker.app/) MCP server. It proxies JSON-RPC from a local MCP client to `https://mcp.moosetracker.app/mcp`. It contains no engine code and no secrets.

This package is MIT-licensed. Moose Tracker itself is a separate product.

## Setup

Requires Node.js 18 or later. No sign-in and no API key.

The connector URL is `https://mcp.moosetracker.app/mcp` (Streamable HTTP). This bridge is for clients that speak MCP over stdio.

```json
{
  "mcpServers": {
    "moose-tracker": {
      "command": "npx",
      "args": ["-y", "moosetracker-mcp"]
    }
  }
}
```

You can also run it directly:

```
npx moosetracker-mcp
```

Optional: set `MOOSETRACKER_MCP_URL` to a different MCP URL (for tests or a staging host). The default is the live server above.

A share link from the `song` tool plays the song in the browser and does not need a render. Use `render` or `sfx` when you want audio files to embed in a game, an app, a presentation or a video.

More setup, including adding the remote URL directly in clients that support Streamable HTTP, is at https://moosetracker.app/ai.

## License

MIT. See `LICENSE`.
