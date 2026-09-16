# Skills

Versioned Agent Skills, symlinked to `~/.agents/skills`, `~/.claude/skills`,
`~/.config/opencode/skills` and `~/.codex/skills` via `bun run setup`.
Only skills listed here load in agents. Anything else on disk is reported
as orphan by setup and never loads from this repo.

## Provenance

Most skills below are vendored from third-party upstreams installed via
`skills add`. Each skill remains the work of its authors. Only
`rust-skills` ships its own LICENSE file. When adding a skill, record
its source with a one-line note in this file.
