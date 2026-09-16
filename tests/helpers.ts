/** Shared helpers for the test suite. Not a test file. */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Absolute path of the dotfiles repo root (tests/ lives at its root). */
export const repoRoot = path.resolve(here, '..')

export function repoPath(...parts: string[]): string {
  return path.join(repoRoot, ...parts)
}

/** A fresh empty directory under the OS temp dir, removed by nobody. */
export function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`))
}
