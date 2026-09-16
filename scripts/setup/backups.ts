/**
 * Shared backup-file scanning and retention for setup and install.
 *
 * Backups use the exact naming this repo produces: a `.bak-<ISO
 * timestamp>` suffix appended to the replaced path. `purgeOldBackups`
 * deletes only timestamped backups older than the retention window.
 * The `pre-push.bak` hook copy from bootstrap.sh carries no timestamp,
 * so it is excluded from retention and only removed by hand with
 * `bun run clean --force`.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const home = process.env.HOME || process.env.USERPROFILE || ''

// Repo root resolved from this file, never from the caller cwd.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// How long a backup survives before the next setup or install purges it.
export const RETENTION_DAYS = 3

// Every directory setup.ts and install.ts write backups into, plus
// the top-level home files they rename.
const scanRoots = [
  home,
  path.join(home, '.config'),
  path.join(home, '.claude'),
  path.join(home, '.codex'),
  path.join(home, '.lmstudio'),
  path.join(home, '.agents'),
  path.join(home, 'Library', 'Application Support', 'Claude Desktop'),
  path.join(repo, '.git', 'hooks'),
]

// ISO timestamp format from `new Date().toISOString().replace(/[:.]/g, '-')`.
const BAK_TIMESTAMP = /\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/

/** True when a path matches the backup naming this repo produces. */
export function isBackupPath(file: string): boolean {
  return BAK_TIMESTAMP.test(file)
}

function collect(root: string, found: string[]) {
  if (!fs.existsSync(root)) return
  for (const entry of fs.readdirSync(root)) {
    if (entry.startsWith('.git')) continue
    const full = path.join(root, entry)
    if (isBackupPath(full) || entry === 'pre-push.bak') {
      found.push(full)
      continue
    }
    let entryStat
    try {
      entryStat = fs.statSync(full)
    } catch {
      continue
    }
    if (entryStat.isDirectory() && root !== home) collect(full, found)
  }
}

/** Every backup under the given roots, sorted. Testable core of listBackups. */
export function collectBackups(roots: string[]): string[] {
  const found: string[] = []
  for (const root of roots) collect(root, found)
  return found.sort()
}

/** Every backup file this repo produced, sorted. */
export function listBackups(): string[] {
  return collectBackups(scanRoots)
}

/** Creation timestamp encoded in a backup file name, or null. */
export function parseBackupTimestamp(file: string): Date | null {
  const match = file.match(/\.bak-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/)
  if (!match) return null
  const [, date, hours, minutes, seconds, millis] = match
  return new Date(`${date}T${hours}:${minutes}:${seconds}.${millis}Z`)
}

/** Delete timestamped backups older than RETENTION_DAYS, return their paths. */
export function purgeOldBackups(): string[] {
  return purgeOldBackupsIn(scanRoots)
}

/** Testable core of purgeOldBackups over explicit roots. */
export function purgeOldBackupsIn(roots: string[], now = Date.now()): string[] {
  const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000
  const removed: string[] = []
  for (const file of collectBackups(roots)) {
    const timestamp = parseBackupTimestamp(file)
    if (!timestamp || timestamp.getTime() >= cutoff) continue
    fs.rmSync(file, { recursive: true, force: true })
    removed.push(file)
  }
  return removed
}
