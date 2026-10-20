/**
 * Install MCP configs to a remote server over SSH.
 *
 * Steps:
 *   1. Rebuild ./mcp/*.json locally for the server profile (servers
 *      marked profiles: ['local'] in servers.ts are left out) so
 *      secrets from .env are fresh. The .env file itself never
 *      leaves the Mac; its values are already baked into the
 *      generated configs.
 *   2. Send the repo as a tarball piped over SSH to <dest>:~/.dotfiles,
 *      skipping .git, node_modules and .env*. tar is used instead of
 *      rsync because minimal servers ship tar but not rsync.
 *      Re-running overwrites the copy in place.
 *   3. Rebuild the local profile so ./mcp matches this Mac again.
 *   4. Install bun on the server if missing. The MCP stdio servers
 *      run through bunx and uvx, so bun is needed there anyway.
 *   5. Run scripts/setup/install.ts on the server for the chosen
 *      targets, with the same merge and backup behavior as locally.
 *      Claude Code servers land at user scope (top-level mcpServers
 *      in ~/.claude.json) so they apply to every project there.
 *
 * Usage:
 *   bun run install:server user@host
 *   bun run install:server my-alias          # any host from ~/.ssh/config
 *   bun run install:server user@host zed     # explicit target list
 *
 * Claude Desktop and LM Studio are Mac-only and refused here.
 */

import type { SpawnSyncOptions } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Directory the repo is unpacked into, relative to the remote home.
export const REMOTE_DIR = '.dotfiles'

// Patterns tar must skip, anchored at the repo root: tar entries are
// ./-prefixed. Secrets and machine-local working files never ship.
export const TAR_EXCLUDES = [
  './.git',
  './node_modules',
  './.env',
  './.env.*',
  './.agents',
  './.claude',
  './skills-lock.json',
]

/** tar arguments that create the repo tarball with the excludes applied. */
export function tarCreateArgs(tarball: string): string[] {
  return [
    '-czf', tarball,
    // Plain ustar carries no extended headers, so remote GNU tar does
    // not warn about macOS xattrs like com.apple.provenance.
    '--format', 'ustar',
    // Each pattern must ride a --exclude flag, otherwise tar treats
    // it as a file to archive.
    ...TAR_EXCLUDES.flatMap(pattern => ['--exclude', pattern]),
    '-C', repo, '.',
  ]
}

// Targets that make sense on a headless Linux server. Claude Desktop
// and LM Studio are Mac-only; zed is allowed for a desktop Linux box.
export const VALID_REMOTE_TARGETS = ['zed', 'claudeCode', 'opencode', 'codex']
export const DEFAULT_REMOTE_TARGETS = ['opencode', 'claudeCode', 'codex']

export const BUN_INSTALL_CMD =
  'if command -v curl >/dev/null 2>&1; then curl -fsSL https://bun.sh/install | bash; else wget -qO- https://bun.sh/install | bash; fi'

const USAGE = `Usage: bun run install:server <user@host> [targets...]
Targets: ${VALID_REMOTE_TARGETS.join(', ')} (default: ${DEFAULT_REMOTE_TARGETS.join(' ')})`

export interface RemoteInstallPlan {
  dest: string
  targets: string[]
}

/** Validate argv into an ssh destination and an install target list. */
export function parseServerArgs(args: string[]): RemoteInstallPlan {
  const dest = args[0] ?? ''
  if (!dest || dest.startsWith('-')) {
    throw new Error(USAGE)
  }
  const targets = args.slice(1)
  const macOnly = targets.filter(t => t === 'claude' || t === 'lmstudio')
  if (macOnly.length > 0) {
    throw new Error(`Target(s) ${macOnly.join(', ')} are Mac-only and cannot be installed on a server.`)
  }
  const unknown = targets.filter(t => !VALID_REMOTE_TARGETS.includes(t))
  if (unknown.length > 0) {
    throw new Error(`Unknown target(s): ${unknown.join(', ')}. Valid: ${VALID_REMOTE_TARGETS.join(', ')}`)
  }
  return { dest, targets: targets.length > 0 ? targets : [...DEFAULT_REMOTE_TARGETS] }
}

/** Shell line executed on the server: PATH for a fresh bun install, then the installer. */
export function buildRemoteCommand(targets: string[]): string {
  const run = `bun scripts/setup/install.ts ${targets.join(' ')}`
  return `export PATH="$HOME/.bun/bin:$PATH" && cd ~/${REMOTE_DIR} && DOTFILES_CLAUDE_CODE_USER_SCOPE=1 ${run}`
}

// Repo root resolved from this file, never from the caller cwd.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function run(cmd: string, args: string[], opts: SpawnSyncOptions = {}): number {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  return res.status ?? 1
}

function main(): number {
  let plan: RemoteInstallPlan
  try {
    plan = parseServerArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return 1
  }
  const { dest, targets } = plan

  // Fresh configs for the server profile, with the local .env secrets
  // baked in. A caller can override the profile through MCP_PROFILE.
  console.log('→ Building MCP configs locally (server profile)')
  if (run('bun', ['run', 'build'], {
    cwd: repo,
    env: { ...process.env, MCP_PROFILE: process.env.MCP_PROFILE || 'server' },
  }) !== 0) {
    console.error('Local build failed, nothing was sent.')
    return 1
  }

  console.log(`→ Packing repo and sending it to ${dest}:~/${REMOTE_DIR}`)
  const tarball = path.join(os.tmpdir(), `dotfiles-${process.pid}-${Date.now()}.tar.gz`)
  if (run('tar', tarCreateArgs(tarball)) !== 0) {
    console.error('Local tar failed, nothing was sent.')
    return 1
  }
  // Pipe the tarball into a remote extract over a single ssh; a
  // file-descriptor stdin avoids a local shell pipeline.
  const tarFd = fs.openSync(tarball, 'r')
  const sent = run('ssh', [
    '-o', 'ConnectTimeout=10',
    dest,
    `mkdir -p ~/${REMOTE_DIR} && tar -xzf - -C ~/${REMOTE_DIR}`,
  ], { stdio: [tarFd, 'inherit', 'inherit'] })
  fs.closeSync(tarFd)
  fs.rmSync(tarball, { force: true })
  if (sent !== 0) {
    return sent
  }

  // Restore this Mac's profile in ./mcp so a later local install:all
  // never picks up the server-flavored configs.
  console.log('→ Rebuilding local MCP configs')
  if (run('bun', ['run', 'build'], { cwd: repo }) !== 0) {
    console.error('Local rebuild failed; ./mcp still holds the server profile. Rerun "bun run build".')
    return 1
  }

  console.log(`→ Checking bun on ${dest}`)
  const hasBun = run('ssh', ['-o', 'ConnectTimeout=10', dest, 'command -v bun'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  if (hasBun !== 0) {
    console.log(`→ bun not found, installing it on ${dest}`)
    if (run('ssh', [dest, BUN_INSTALL_CMD]) !== 0) {
      console.error('Could not install bun on the server. Install it manually, then rerun.')
      return 1
    }
  }

  console.log(`→ Installing MCP configs on ${dest} (${targets.join(', ')})`)
  const status = run('ssh', [dest, buildRemoteCommand(targets)])
  if (status !== 0) {
    console.error('Remote install failed, see output above.')
    return status
  }
  console.log(`Done! ${dest}:~/${REMOTE_DIR} is kept, rerun this command to update it.`)
  return 0
}

// Import-safe entrypoint: importing this module from tests must not
// deploy anything. tsx and bun both expose the entry script as
// process.argv[1], so compare it against this file.
function isMain(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href
  } catch {
    return false
  }
}

if (isMain()) process.exit(main())
