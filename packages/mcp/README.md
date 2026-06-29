# @proofsource/mcp

ProofSource MCP server — exposes the ProofSource paying research agent as MCP tools for Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

## How to build

```bash
cd packages/mcp
npm install
npm run build   # compiles TypeScript → dist/
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PROOFSOURCE_BASE_URL` | Yes | Base URL of your ProofSource deployment (e.g. `https://proofsource-mu.vercel.app`) |
| `PROOFSOURCE_API_KEY` | Yes | Operator API key (`ps_live_...`) — obtain from registration or `POST /v1/proofsource/auth/apikey/regenerate` |
| `PROOFSOURCE_WORKSPACE_ID` | No | Operator workspace id — defaults to the workspace attached to the API key |

## claude_desktop_config.json

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "proofsource": {
      "command": "npx",
      "args": ["-y", "@proofsource/mcp"],
      "env": {
        "PROOFSOURCE_BASE_URL": "https://proofsource-mu.vercel.app",
        "PROOFSOURCE_API_KEY": "ps_live_YOUR_KEY_HERE",
        "PROOFSOURCE_WORKSPACE_ID": "ws_YOUR_WORKSPACE_ID"
      }
    }
  }
}
```

## .cursor/mcp.json

```json
{
  "mcpServers": {
    "proofsource": {
      "command": "npx",
      "args": ["-y", "@proofsource/mcp"],
      "env": {
        "PROOFSOURCE_BASE_URL": "https://proofsource-mu.vercel.app",
        "PROOFSOURCE_API_KEY": "ps_live_YOUR_KEY_HERE",
        "PROOFSOURCE_WORKSPACE_ID": "ws_YOUR_WORKSPACE_ID"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `proofSource_ask` | Ask a research question; agent decides, pays creators in USDC on Arc, returns answer with citation receipts |
| `proofSource_decide` | Preview source scoring without buying |
| `proofSource_traction` | Live traction metrics (creators earning, payouts, payment count, conversion) |
