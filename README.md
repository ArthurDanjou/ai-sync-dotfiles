# Dotfiles

Mac dotfiles with centralised MCP server configuration, exported to the correct format for **Zed**, **OpenCode**, **Claude Desktop**, **Claude Code CLI**, **Codex CLI**, and **LM Studio**.

Inspired by the pattern from [theme-artlab](https://github.com/ArthurDanjou/theme-artlab): one source of truth, multiple platform outputs.

## Structure

```
dotfiles/
├── bootstrap.sh            ← New Mac: brew bundle + setup + build + install
├── Brewfile                ← brew, cask, cargo packages
├── .env.example            ← Copy to .env, fill in secrets (never committed)
├── home/                   ← Symlinked to ~ via `bun run setup`
│   ├── .zshrc
│   ├── .zprofile
│   ├── .gitconfig
│   ├── .gitignore_global
│   └── .ssh.config.template  ← Copy manually, never symlinked
├── config/                 ← Symlinked to ~/.config via `bun run setup`, except:
│   │   Managed configs (copy-if-missing + MCP merge, never symlinked):
│   │   zed/settings.json, opencode/opencode.jsonc, claude/settings.json
│   ├── starship/starship.toml
│   ├── ghostty/themes/
│   ├── zed/settings.json   ← Without context_servers (managed by MCP)
│   ├── zed/keymap.json
│   ├── zed/tasks.json
│   ├── zed/themes/artlab.json
│   ├── gh/config.yml       ← Without hosts.yml (contains token)
│   ├── opencode/opencode.jsonc ← Without mcp block (managed by MCP)
│   ├── opencode/tui.json
│   ├── opencode/AGENTS.md  ← Versioned copy of scripts/instructions.md
│   ├── opencode/agents/
│   ├── opencode/commands/
│   ├── claude/settings.json ← Versioned keys only, merged at install, hooks stay
├── skills/                 ← Source of truth: 32 kept skills, symlinked to ~/.agents/skills + ~/.claude/skills + ~/.config/opencode/skills + ~/.codex/skills via `bun run setup`
├── claude/CLAUDE.md        ← Versioned copy of scripts/instructions.md
├── scripts/
│   ├── servers.ts          ← Source of truth: all MCP servers defined here
│   ├── instructions.md     ← Source of truth for CLAUDE.md and AGENTS.md instructions
│   ├── zed.ts              Formats servers for Zed (stdio only)
│   ├── claude.ts           Formats servers for Claude Desktop
│   ├── claude-code.ts      Formats servers for Claude Code CLI
│   ├── codex.ts            Formats servers for Codex CLI ([mcp_servers.*] tables)
│   ├── opencode.ts         Formats servers for OpenCode (stdio + remote)
│   ├── lmstudio.ts         Formats servers for LM Studio
│   ├── helper.ts           Shared utilities
│   ├── index.ts            Build orchestrator
│   ├── install.ts          Merges MCP configs into system paths (non-destructive)
│   ├── dotfiles.ts         Symlinks home/ and config/ into $HOME
│   └── audit.ts            Fails on secrets in tracked files
├── hooks/pre-push          ← Runs audit on every push
├── LICENSE                 ← MIT
├── mcp/                    ← Generated output (gitignored, contains secrets)
└── package.json
```

## New Mac

```bash
git clone https://github.com/ArthurDanjou/dotfiles.git ~/Workspace/dotfiles
cd ~/Workspace/dotfiles
./bootstrap.sh
# Fill in .env on first run, then re-run ./bootstrap.sh
```

This runs `brew bundle`, `bun install`, installs the `pre-push` hook, links dotfiles with `bun run setup`, builds configs with `bun run build`, installs them with `bun run install:all`, and finishes with `bun run audit`.

## Usage

### Dotfiles (symlinks with backup)

```bash
bun run setup          # link home/ and config/ files, backup existing to *.bak-*
bun run setup --force  # overwrite without backup
bun run setup --prune  # back up aside home files missing from the repo (never deletes)
bun run check          # build + typecheck + secret audit
bun run audit          # fail if tracked files contain secrets
```

### Build (regenerate platform configs)

```bash
bun run build
```

This reads `scripts/servers.ts` and writes platform configs into `mcp/`.

### Install MCP to system (merge, non-destructive)

```bash
bun run install:all          # installs to all platforms
bun run install:zed          # installs only Zed
bun run install:claude       # installs only Claude Desktop
bun run install:claude-code  # installs only Claude Code CLI
bun run install:opencode     # installs only OpenCode
bun run install:codex        # installs only Codex CLI
bun run install:lmstudio     # installs only LM Studio
```

Managed servers are merged per-server into the existing config: servers from the repo replace the whole entry (a local tweak inside a managed entry is overwritten), extra local servers are preserved, and servers removed from `scripts/servers.ts` stay in place until deleted by hand. A timestamped `.bak` is written before any change. Symlinked destinations are replaced by regular files so generated secrets never leak back into the repo. Files that fail JSONC parsing are never overwritten. Every install also deploys `scripts/instructions.md` to `~/.claude/CLAUDE.md` and `~/.config/opencode/AGENTS.md`, and merges `config/claude/settings.json` into `~/.claude/settings.json`. Note: `install:claude-code` writes under the `projects` entry of your current directory in `~/.claude.json`, so run it from the repo (or any intended project).

Every push runs `bun run audit` via `hooks/pre-push` (installed by `bootstrap.sh`). It fails on token patterns in tracked files and verifies `.env` and `mcp/` stay ignored.

Verify with the v2 CLI: `opencode debug config` shows the resolved config and loaded documents, `opencode mcp list` shows server health.

Notes for opencode v2: the global config is `~/.config/opencode/opencode.jsonc` with canonical v2 keys (`update`, `permissions` array). `tui.json` holds theme and keybinds. There is no `cli.json`. Custom agents live in `agents/` and commands in `commands/` (plural names). Agent files use `permission`, not the deprecated `tools` block.

## Adding a server

1. Edit `scripts/servers.ts` – add an entry to the `servers` array.
2. Run `bun run build` – regenerates all platform configs.
3. Run `bun run install:<platform>` – deploys the change.

## Adding a skill

Skills live in `skills/` as the single source of truth. `bun run setup` symlinks every skill to `~/.agents/skills`, `~/.claude/skills`, `~/.config/opencode/skills` and `~/.codex/skills` so Claude Code, OpenCode and Codex see the same set everywhere.

Run skill commands from `~/Workspace/dotfiles` to make the skill universal. The CLI defaults to project scope inside a git repo, which is exactly what keeps the skill versioned here. Use global scope only to trial a skill without versioning it.

```bash
cd ~/Workspace/dotfiles
bunx skills add <owner/repo> -l                    # preview available skills without installing
bunx skills add <owner/repo> -s <skill-name> -y    # install one skill into ./skills/
bun run setup                                      # symlink it to agents, claude and opencode
bun run check                                      # build plus typecheck plus secret audit
```

A skill installed with `-g` lands in `~/.agents/skills` and stays unversioned. It shows up as orphan on the next setup run. To keep it everywhere, copy it into the repo and rerun setup, then commit the new folder. To use a skill in a single project only, run the same add command from that project directory instead of dotfiles. Verify with `bunx skills list` for project skills and `bunx skills list -g` for global skills.

## Environment variables

Secrets (API keys, tokens) are referenced via `process.env` in `servers.ts` so they are never hardcoded in the repo. Copy `.env.example` to `.env` before building:

```bash
cp .env.example .env
bun run build
```

If a variable is unset, the corresponding `env` block is omitted from the generated config.

## Platform format differences

| Feature          | Zed                        | Claude Desktop             | Claude Code CLI           | OpenCode                              | Codex CLI                             | LM Studio                             |
|------------------|----------------------------|----------------------------|---------------------------|---------------------------------------|---------------------------------------|---------------------------------------|
| Config file      | `~/.config/zed/settings.json` | `~/Library/Application Support/Claude Desktop/claude_desktop_config.json` | `~/.claude.json`        | `~/.config/opencode/opencode.jsonc`    | `~/.codex/config.toml`                | `~/.lmstudio/mcp.json`                |
| Config key       | `context_servers`          | `mcpServers`               | `projects[…]mcpServers`   | `mcp`                                 | `mcp_servers`                         | `mcpServers`                          |
| Remote servers   | ❌ Not supported           | ✅ Supported via `url`     | ✅ Supported (`type: http`) | ✅ Supported (`type: remote`)           | ✅ Supported via `url`                | ✅ Supported via `url`                 |
| Command format   | `{ command, args }`        | `{ command, args }`        | `{ command, args }`       | `{ type: local, command: string[] }`  | `[mcp_servers.name]` TOML table       | `{ command, args }`                   |
| Env vars         | `env`                      | `env`                      | `env`                     | `environment`                         | `[mcp_servers.name.env]`              | `env`                                 |
| Enable/disable   | —                          | —                          | —                         | `enabled`                             | —                                     | —                                     |

## License

MIT
