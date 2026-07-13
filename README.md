# ArtAI MCP

Centralised MCP server configuration, exported to the correct format for **Zed**, **OpenCode**, and **Claude Desktop**.

Inspired by the pattern from [theme-artlab](https://github.com/ArthurDanjou/theme-artlab): one source of truth, multiple platform outputs.

## Structure

```
artai/
├── scripts/
│   ├── servers.ts      ← Source of truth: all MCP servers defined here
│   ├── zed.ts           Formats servers for Zed (stdio only)
│   ├── claude.ts        Formats servers for Claude Desktop (stdio only)
│   ├── opencode.ts      Formats servers for OpenCode (stdio + remote)
│   ├── helper.ts        Shared utilities
│   ├── index.ts         Build orchestrator
│   └── install.ts       Installs configs to system paths
├── mcp/                 ← Generated output (gitignored)
│   ├── zed.json
│   ├── claude.json
│   └── opencode.json
├── package.json
└── tsconfig.json
```

## Usage

### Build (regenerate platform configs)

```bash
bun run build
```

This reads `scripts/servers.ts` and writes three files into `mcp/`.

### Install to system

```bash
bun run install:all     # installs to all platforms
bun run install:zed     # installs only Zed
bun run install:claude  # installs only Claude Desktop
bun run install:opencode # installs only OpenCode
```

## Adding a server

1. Edit `scripts/servers.ts` – add an entry to the `servers` array.
2. Run `bun run build` – regenerates all three platform configs.
3. Run `bun run install:<platform>` – deploys the change.

## Environment variables

Secrets (API keys, tokens) are referenced via `process.env` in `servers.ts` so they
are never hardcoded in the repo. Set them in your shell or a `.env` file before building:

```bash
export FIRECRAWL_API_KEY="fc-xxx"
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxx"
export KARAKEEP_API_KEY="ak_xxx"
bun run build
```

If a variable is unset, the corresponding `env` block is omitted from the generated config.

## Platform format differences

| Feature          | Zed                        | Claude Desktop             | OpenCode                              |
|------------------|----------------------------|----------------------------|---------------------------------------|
| Config key       | `context_servers`          | `mcpServers`               | `mcp`                                 |
| Remote servers   | ❌ Not supported           | ❌ Not supported           | ✅ Supported                          |
| Command format   | `{ command, args }`        | `{ command, args }`        | `{ command: string[] }`               |
| Env vars         | `env`                      | `env`                      | `environment`                         |
| Enable/disable   | —                          | —                          | `enabled`                             |

## License

MIT
