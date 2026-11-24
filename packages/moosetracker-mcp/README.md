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

## Sheet music from photos

`convert` with `from: "photo"` and a file `path` (or base64 `input`, or the `upload` job of a photo sent from a phone) reads the photo on this computer. The bridge runs [homr](https://github.com/liebharc/homr/tree/v0.7.1) 0.7.1, an optical music recognition program, unmodified as its own process through [uv](https://docs.astral.sh/uv/):

```
uvx --from 'homr[cpu]==0.7.1' homr --no-title <photo>
```

Install uv first. The first photo downloads homr and its models (about 130 MB); after that a page takes about 5 to 50 seconds of CPU time and about 1.3 GB of memory. Before homr reads it, `bin/omr-prep.py` (ours, MIT, using OpenCV and NumPy through uv) flattens the page, turns a sideways photo, levels a tilted one and scales it to 3000 pixels. The MusicXML homr writes goes to the server as an ordinary MusicXML import, and the reply is the song plus flags for the bars to check against the photo. The photo is read in a temporary folder that is deleted afterwards; nothing is written next to your file.

- `MOOSETRACKER_PREP=0` skips the preparation step.
- `MOOSETRACKER_HOMR=<command>` runs another homr command instead of uvx (for example one you installed with pip).

homr is licensed under the AGPL-3.0. This package contains none of its code; uv fetches the official release when your computer first runs it. See https://moosetracker.app/licenses.html.

## License

MIT. See `LICENSE`.
