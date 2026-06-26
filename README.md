# mcp-caniuse

caniuse MCP — browser feature support tables

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 965+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `feature` | Full caniuse record for a feature id (e.g. "css-grid", "fetch", "webp"). |
| `search` | Search features by title / keyword. |
| `list_browsers` | Return all browser IDs tracked by caniuse (e.g. chrome, safari, firefox, edge, ios_saf) with their recent version strings; use IDs with the `support` tool. |
| `support` | Convenience: is this feature supported in this browser version? Returns the raw caniuse support string + a parsed verdict. |

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

Or connect to the full Pipeworx gateway for access to all 965+ data sources:

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

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
