import { afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { backup, linkDirContents, linkOne, links } from '../scripts/setup/dotfiles'
import { makeTempDir, repoPath } from './helpers'

const temps: string[] = []
afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('links table', () => {
  test('every source exists in the repo and destinations are unique', () => {
    const all = links()
    expect(all.length).toBeGreaterThan(0)
    const dsts = new Set(all.map(l => l.dst))
    expect(dsts.size).toBe(all.length)
    for (const { src } of all) {
      expect(fs.existsSync(src), `missing source ${src}`).toBe(true)
      expect(path.resolve(src).startsWith(repoPath()), `${src} escapes the repo`).toBe(true)
    }
  })
})

describe('linkOne and backup in isolation', () => {
  test('links, keeps idempotent links, and backs up conflicts', () => {
    const dir = makeTempDir('links')
    temps.push(dir)
    const src = path.join(dir, 'src.txt')
    const dst = path.join(dir, 'dst.txt')
    fs.writeFileSync(src, 'v1')

    linkOne({ src, dst })
    expect(fs.readlinkSync(dst)).toBe(src)

    linkOne({ src, dst })
    expect(fs.readlinkSync(dst)).toBe(src)

    fs.rmSync(dst)
    fs.writeFileSync(dst, 'local edits')
    linkOne({ src, dst })
    expect(fs.readlinkSync(dst)).toBe(src)
    const bak = fs.readdirSync(dir).find(f => f.startsWith('dst.txt.bak-'))
    expect(bak, 'conflict should leave a timestamped backup').toBeTruthy()
    expect(fs.readFileSync(path.join(dir, bak!), 'utf-8')).toBe('local edits')
  })

  test('backup removes stale symlinks instead of renaming them', () => {
    const dir = makeTempDir('backup')
    temps.push(dir)
    const dst = path.join(dir, 'stale.txt')
    fs.symlinkSync(path.join(dir, 'nowhere.txt'), dst)
    backup(dst)
    expect(fs.existsSync(dir)).toBe(true)
    expect(fs.readdirSync(dir)).toEqual([])
  })
})

describe('linkDirContents in isolation', () => {
  test('links wanted files and reports orphans without touching them', () => {
    const dir = makeTempDir('linkdir')
    temps.push(dir)
    const srcDir = path.join(dir, 'src')
    const dstDir = path.join(dir, 'dst')
    fs.mkdirSync(srcDir, { recursive: true })
    fs.mkdirSync(dstDir, { recursive: true })
    fs.writeFileSync(path.join(srcDir, 'a.md'), 'a')
    fs.writeFileSync(path.join(srcDir, 'skip.txt'), 'not a command')
    fs.writeFileSync(path.join(dstDir, 'orphan.md'), 'local')

    linkDirContents(srcDir, dstDir)
    expect(fs.readlinkSync(path.join(dstDir, 'a.md'))).toBe(path.join(srcDir, 'a.md'))
    expect(fs.existsSync(path.join(dstDir, 'skip.txt'))).toBe(false)
    expect(fs.readFileSync(path.join(dstDir, 'orphan.md'), 'utf-8')).toBe('local')
  })
})
