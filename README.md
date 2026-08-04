# @pipeworx/caniuse

Can I Use MCP — browser compatibility data for HTML / CSS / JS features. Sourced from Fyrd's caniuse-db. Keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `feature(name)` — full record for a feature by id
- `search(query)` — search features by title / keyword
- `list_browsers()` — browser ids + version tracks
- `support(feature, browser, version?)` — convenience: is this feature supported in this browser?

## Data source

`https://raw.githubusercontent.com/Fyrd/caniuse/main/data.json` — cached in worker memory for 24h.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "caniuse": {
      "url": "https://gateway.pipeworx.io/caniuse/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Caniuse data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
