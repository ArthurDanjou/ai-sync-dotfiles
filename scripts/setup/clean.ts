/**
 * Clean up backup files created by setup and install.
 *
 * Usage:
 *   bun run clean          # list every .bak file (dry run)
 *   bun run clean --force  # delete them
 *
 * The scan lives in backups.ts, which also purges backups older than
 * RETENTION_DAYS automatically at the start of every setup and install.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { listBackups } from './backups'

const force = process.argv.includes('--force')

function main() {
  const found = listBackups()
  if (found.length === 0) {
    console.log('No .bak files found.')
    return
  }

  for (const file of found) {
    console.log(`${force ? 'rm' : 'would rm'}  ${file}`)
  }
  if (!force) {
    console.log(`\n${found.length} backup file(s). Run "bun run clean --force" to delete.`)
    return
  }
  for (const file of found) {
    fs.rmSync(file, { recursive: true, force: true })
  }
  console.log(`\nDeleted ${found.length} backup file(s).`)
}

// Import-safe entrypoint, see install.ts.
function isMain(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href
  } catch {
    return false
  }
}

if (isMain()) main()
