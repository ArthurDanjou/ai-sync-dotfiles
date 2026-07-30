# ArtAI MCP

Centralised MCP server configuration, exported to the correct format for **Zed**, **OpenCode**, **Claude Desktop**, and **Claude Code CLI**.

Inspired by the pattern from [theme-artlab](https://github.com/ArthurDanjou/theme-artlab): one source of truth, multiple platform outputs.

## Structure

```
artai/
├── scripts/
│   ├── servers.ts         ← Source of truth: all MCP servers defined here
│   ├── zed.ts             Formats servers for Zed (stdio only)
│   ├── claude.ts          Formats servers for Claude Desktop (stdio only)
│   ├── claude-code.ts     Formats servers for Claude Code CLI (stdio only)
│   ├── opencode.ts        Formats servers for OpenCode (stdio + remote)
│   ├── helper.ts          Shared utilities
│   ├── index.ts           Build orchestrator
│   └── install.ts         Installs configs to system paths
├── mcp/                   ← Generated output (gitignored)
│   ├── zed.json
│   ├── claude.json
│   ├── claude-code.json
│   └── opencode.json
├── package.json
└── tsconfig.json
```

## Usage

### Build (regenerate platform configs)

```bash
bun run build
```

This reads `scripts/servers.ts` and writes platform configs into `mcp/`.

### Install to system

```bash
bun run install:all          # installs to all platforms
bun run install:zed          # installs only Zed
bun run install:claude       # installs only Claude Desktop
bun run install:claude-code  # installs only Claude Code CLI
bun run install:opencode     # installs only OpenCode
bun run install:lmstudio     # installs only LM Studio
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

| Feature          | Zed                        | Claude Desktop             | Claude Code CLI           | OpenCode                              | LM Studio                             |
|------------------|----------------------------|----------------------------|---------------------------|---------------------------------------|---------------------------------------|
| Config file      | `~/.config/zed/settings.json` | `claude_desktop_config.json` | `~/.claude.json`        | `~/.config/opencode/opencode.jsonc`    | `~/.lmstudio/mcp.json`                |
| Config key       | `context_servers`          | `mcpServers`               | `projects[…]mcpServers`   | `mcp`                                 | `mcpServers`                          |
| Remote servers   | ❌ Not supported           | ✅ Supported via `url`     | ✅ Supported (`type: http`) | ✅ Supported                          | ✅ Supported via `url`                 |
| Command format   | `{ command, args }`        | `{ command, args }`        | `{ command, args }`       | `{ command: string[] }`               | `{ command, args }`                   |
| Env vars         | `env`                      | `env`                      | `env`                     | `environment`                         | `env`                                 |
| Enable/disable   | —                          | —                          | —                         | `enabled`                             | —                                     |

## License

MIT
