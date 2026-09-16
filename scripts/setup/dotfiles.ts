/**
 * Link versioned dotfiles into the home directory.
 *
 * Usage:
 *   bun run setup            # link home/ and config/ files
 *   bun run setup --force    # overwrite without backup
 *   bun run setup --prune    # back up orphans aside (never deletes data)
 *
 * Strategy: symlink each tracked file, backup any existing
 * regular file to <path>.bak-<timestamp>. Never touches secrets:
 * .env, hosts.yml, SSH keys, and generated mcp/*.json are excluded.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repo = process.cwd()
const home = process.env.HOME || process.env.USERPROFILE || ''
if (!home) {
  console.error('HOME is unset, refusing to guess link locations.')
  process.exit(1)
}
const force = process.argv.includes('--force')
const prune = process.argv.includes('--prune')

interface Link {
  src: string
  dst: string
}

function links(): Link[] {
  const dst = (p: string) => path.join(home, p)
  const src = (p: string) => path.join(repo, p)
  return [
    { src: src('home/.zshrc'), dst: dst('.zshrc') },
    { src: src('home/.zprofile'), dst: dst('.zprofile') },
    { src: src('home/.gitconfig'), dst: dst('.gitconfig') },
    { src: src('home/.gitignore_global'), dst: dst('.gitignore_global') },
    { src: src('Brewfile'), dst: dst('Brewfile') },
    { src: src('config/starship/starship.toml'), dst: dst('.config/starship.toml') },
    { src: src('config/ghostty/themes/artlab-dark'), dst: dst('.config/ghostty/themes/artlab-dark') },
    { src: src('config/ghostty/themes/artlab-light'), dst: dst('.config/ghostty/themes/artlab-light') },
    { src: src('config/ghostty/themes/ghostty-artlab-dark'), dst: dst('.config/ghostty/themes/ghostty-artlab-dark') },
    { src: src('config/ghostty/themes/ghostty-artlab-light'), dst: dst('.config/ghostty/themes/ghostty-artlab-light') },
    { src: src('config/zed/keymap.json'), dst: dst('.config/zed/keymap.json') },
    { src: src('config/zed/tasks.json'), dst: dst('.config/zed/tasks.json') },
    { src: src('config/zed/themes/artlab.json'), dst: dst('.config/zed/themes/artlab.json') },
    // Note: config/zed/settings.json and config/opencode/opencode.jsonc are
    // intentionally NOT symlinked. They mix versioned base settings with
    // generated MCP servers containing secrets. bootstrap.sh copies the
    // template on first run if missing, then install.ts merges MCP servers.
    { src: src('config/gh/config.yml'), dst: dst('.config/gh/config.yml') },
    { src: src('config/opencode/tui.json'), dst: dst('.config/opencode/tui.json') },
    { src: src('config/opencode/AGENTS.md'), dst: dst('.config/opencode/AGENTS.md') },
    { src: src('claude/CLAUDE.md'), dst: dst('.claude/CLAUDE.md') },
    // Note: config/claude/settings.json follows the same principle for
    // Claude Code settings: versioned keys merge at install via
    // installClaudeCodeSettings, machine hooks stay untouched.
  ]
}

function backup(dst: string) {
  // Unlinking a symlink never deletes data, so stale links are
  // removed directly instead of renamed into dangling .bak links.
  if (fs.lstatSync(dst).isSymbolicLink()) {
    fs.unlinkSync(dst)
    console.log(`  removed stale symlink ${dst}`)
    return
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const bak = `${dst}.bak-${stamp}`
  fs.renameSync(dst, bak)
  console.log(`  backup ${dst} -> ${bak}`)
}

function linkOne({ src, dst }: Link) {
  if (!fs.existsSync(src)) {
    console.log(`  skip missing ${src}`)
    return
  }
  const stat = fs.lstatSync(src, { throwIfNoEntry: false })
  if (!stat) return
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  try {
    const existing = fs.lstatSync(dst, { throwIfNoEntry: false })
    if (existing) {
      if (existing.isSymbolicLink() && fs.readlinkSync(dst) === src) {
        console.log(`  ok ${dst}`)
        return
      }
      if (!force) backup(dst)
      else fs.rmSync(dst, { recursive: true, force: true })
    }
  } catch {
    // Destination does not exist, continue to link.
  }
  fs.symlinkSync(src, dst)
  console.log(`  link ${dst} -> ${src}`)
}

function linkDirContents(srcDir: string, dstDir: string, ext = '.md') {
  if (!fs.existsSync(srcDir)) return
  const wanted = new Set<string>()
  for (const entry of fs.readdirSync(srcDir)) {
    if (!entry.endsWith(ext)) continue
    wanted.add(entry)
    linkOne({ src: path.join(srcDir, entry), dst: path.join(dstDir, entry) })
  }
  if (!fs.existsSync(dstDir)) return
  for (const entry of fs.readdirSync(dstDir)) {
    if (!entry.endsWith(ext) || wanted.has(entry)) continue
    const dst = path.join(dstDir, entry)
    if (prune) {
      backup(dst)
      console.log(`  pruned ${dst} (see backup above)`)
    } else {
      console.log(`  orphan ${dst} (not in repo, run with --prune to back it up aside)`)
    }
  }
}

function linkSkillDirs(srcDir: string, dstDirs: string[]) {
  if (!fs.existsSync(srcDir)) return
  const skills = fs.readdirSync(srcDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => fs.existsSync(path.join(srcDir, name, 'SKILL.md')))
  for (const name of skills) {
    for (const dstDir of dstDirs) {
      linkOne({ src: path.join(srcDir, name), dst: path.join(dstDir, name) })
    }
  }
  for (const dstDir of dstDirs) {
    if (!fs.existsSync(dstDir)) continue
    for (const entry of fs.readdirSync(dstDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      const name = entry.name
      if (name.startsWith('.')) continue
      if (name.includes('.bak-')) continue
      if (!skills.includes(name)) {
        const dst = path.join(dstDir, name)
        if (prune) {
          try {
            backup(dst)
            console.log(`  pruned ${dst} (see backup above)`)
          } catch (err) {
            console.log(`  skip prune ${dst}: ${err}`)
          }
        } else {
          console.log(`  orphan ${dst} (not in repo, run with --prune to back it up aside)`)
        }
      }
    }
  }
}

function copyIfMissing(src: string, dst: string) {
  try {
    // lstat succeeds on dangling symlinks, so resolve the target too.
    fs.statSync(dst)
    return
  } catch {
    // Destination missing or dangling, replace it with the template.
    try {
      fs.unlinkSync(dst)
    } catch {
      // Nothing to remove.
    }
  }
  if (!fs.existsSync(src)) return
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
  console.log(`  init ${dst} (from template)`)
}

function main() {
  console.log('Linking dotfiles...\n')
  for (const link of links()) linkOne(link)
  console.log('\nManaged configs (copy template if missing, MCP merged by install)...')
  copyIfMissing(path.join(repo, 'config/zed/settings.json'), path.join(home, '.config/zed/settings.json'))
  copyIfMissing(path.join(repo, 'config/opencode/opencode.jsonc'), path.join(home, '.config/opencode/opencode.jsonc'))
  console.log('\nLinking opencode agents and commands...')
  linkDirContents(path.join(repo, 'config/opencode/agents'), path.join(home, '.config/opencode/agents'))
  linkDirContents(path.join(repo, 'config/opencode/commands'), path.join(home, '.config/opencode/commands'))
  console.log('\nLinking skills (universal: agents + claude + opencode)...')
  linkSkillDirs(path.join(repo, 'skills'), [
    path.join(home, '.agents', 'skills'),
    path.join(home, '.claude', 'skills'),
    path.join(home, '.config', 'opencode', 'skills'),
    path.join(home, '.codex', 'skills'),
  ])
  console.log('\nDone. Restart your shell to apply changes.')
}

main()
