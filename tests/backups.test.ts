import { afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  collectBackups,
  isBackupPath,
  listBackups,
  parseBackupTimestamp,
  purgeOldBackupsIn,
  RETENTION_DAYS,
} from '../scripts/setup/backups'
import { makeTempDir } from './helpers'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

function seed(): string {
  const root = makeTempDir('backups')
  roots.push(root)
  const old = new Date(Date.now() - (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000)
  const stamp = (d: Date) => d.toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(path.join(root, `old.txt.bak-${stamp(old)}`), 'old')
  fs.writeFileSync(path.join(root, `new.txt.bak-${stamp(new Date())}`), 'new')
  fs.writeFileSync(path.join(root, 'pre-push.bak'), 'hook')
  fs.writeFileSync(path.join(root, 'regular.txt'), 'keep')
  fs.mkdirSync(path.join(root, 'sub'))
  fs.writeFileSync(path.join(root, 'sub', `nested.txt.bak-${stamp(old)}`), 'nested')
  return root
}

describe('isBackupPath', () => {
  test('matches only the timestamped backup naming', () => {
    expect(isBackupPath('a.bak-2026-09-16T07-58-59-790Z')).toBe(true)
    expect(isBackupPath('pre-push.bak')).toBe(false)
    expect(isBackupPath('regular.txt')).toBe(false)
  })
})

describe('parseBackupTimestamp', () => {
  test('decodes the timestamp encoded in the file name', () => {
    expect(parseBackupTimestamp('a.bak-2026-09-16T07-58-59-790Z'))
      .toEqual(new Date('2026-09-16T07:58:59.790Z'))
    expect(parseBackupTimestamp('regular.txt')).toBeNull()
  })
})

describe('collectBackups and purgeOldBackupsIn', () => {
  test('collect finds timestamped backups, nested ones and the hook copy', () => {
    const found = collectBackups([seed()]).map(f => path.basename(f)).sort()
    expect(found).toHaveLength(4)
    expect(found.some(f => f === 'pre-push.bak')).toBe(true)
    expect(found.some(f => f === 'regular.txt')).toBe(false)
  })

  test('purge removes only backups older than the retention window', () => {
    const root = seed()
    const removed = purgeOldBackupsIn([root]).map(f => path.basename(f)).sort()
    expect(removed).toHaveLength(2)
    expect(removed.some(f => f.startsWith('old.txt'))).toBe(true)
    expect(removed.some(f => f.startsWith('nested.txt'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'pre-push.bak'))).toBe(true)
    expect(remaining(root)).toHaveLength(2)
  })

  function remaining(root: string): string[] {
    return collectBackups([root]).map(f => path.basename(f))
  }
})

describe('retention policy', () => {
  test('the window is three days', () => {
    expect(RETENTION_DAYS).toBe(3)
  })

  test('listBackups returns a sorted array', () => {
    const found = listBackups()
    expect([...found].sort()).toEqual(found)
  })
})
