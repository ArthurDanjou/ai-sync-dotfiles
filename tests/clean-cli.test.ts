import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { makeTempDir, repoPath } from './helpers'

const temps: string[] = []
afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

function fakeHome(): { home: string; oldBak: string; recentBak: string; kept: string } {
  const home = makeTempDir('fakehome')
  temps.push(home)
  const dir = path.join(home, '.config', 'demo')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = (d: Date) => d.toISOString().replace(/[:.]/g, '-')
  const old = new Date('2020-01-01T00:00:00.000Z')
  const oldBak = path.join(dir, `old.json.bak-${stamp(old)}`)
  const recentBak = path.join(dir, `new.json.bak-${stamp(new Date())}`)
  const kept = path.join(dir, 'settings.json')
  fs.writeFileSync(oldBak, '{}')
  fs.writeFileSync(recentBak, '{}')
  fs.writeFileSync(kept, '{}')
  return { home, oldBak, recentBak, kept }
}

function runClean(home: string, force: boolean): string {
  return execFileSync('bun', [repoPath('scripts', 'setup', 'clean.ts'), ...(force ? ['--force'] : [])], {
    env: { ...process.env, HOME: home },
    encoding: 'utf-8',
  })
}

describe('clean CLI with an isolated HOME', () => {
  test('dry run lists backups without deleting anything', () => {
    const { home, oldBak, recentBak, kept } = fakeHome()
    const out = runClean(home, false)
    expect(out).toContain('would rm')
    expect(out).toContain(oldBak)
    expect(out).toContain(recentBak)
    expect(fs.existsSync(oldBak)).toBe(true)
    expect(fs.existsSync(recentBak)).toBe(true)
    expect(fs.existsSync(kept)).toBe(true)
  })

  test('--force deletes backups and keeps regular files', () => {
    const { home, oldBak, recentBak, kept } = fakeHome()
    const out = runClean(home, true)
    expect(out).toMatch(/Deleted \d+ backup file\(s\)\./)
    expect(fs.existsSync(oldBak)).toBe(false)
    expect(fs.existsSync(recentBak)).toBe(false)
    expect(fs.existsSync(kept)).toBe(true)
  })
})
