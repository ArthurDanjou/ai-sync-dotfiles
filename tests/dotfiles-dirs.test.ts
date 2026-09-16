import { afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { copyIfMissing, linkSkillDirs } from '../scripts/setup/dotfiles'
import { makeTempDir } from './helpers'

const temps: string[] = []
afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('copyIfMissing', () => {
  test('seeds absent destinations and never overwrites existing ones', () => {
    const dir = makeTempDir('copyifmissing')
    temps.push(dir)
    const src = path.join(dir, 'template.json')
    const dst = path.join(dir, 'live.json')
    fs.writeFileSync(src, '{"seeded": true}')

    copyIfMissing(src, dst)
    expect(JSON.parse(fs.readFileSync(dst, 'utf-8'))).toEqual({ seeded: true })

    fs.writeFileSync(dst, '{"local": true}')
    copyIfMissing(src, dst)
    expect(JSON.parse(fs.readFileSync(dst, 'utf-8'))).toEqual({ local: true })
  })

  test('replaces dangling symlinks with the template', () => {
    const dir = makeTempDir('copyifmissing')
    temps.push(dir)
    const src = path.join(dir, 'template.json')
    const dst = path.join(dir, 'live.json')
    fs.writeFileSync(src, '{}')
    fs.symlinkSync(path.join(dir, 'nowhere.json'), dst)
    copyIfMissing(src, dst)
    expect(fs.lstatSync(dst).isSymbolicLink()).toBe(false)
    expect(fs.readFileSync(dst, 'utf-8')).toBe('{}')
  })
})

describe('linkSkillDirs', () => {
  function seedSkills(): { srcDir: string; dstDir: string } {
    const dir = makeTempDir('skills')
    temps.push(dir)
    const srcDir = path.join(dir, 'repo-skills')
    const dstDir = path.join(dir, 'home-skills')
    fs.mkdirSync(path.join(srcDir, 'real'), { recursive: true })
    fs.writeFileSync(path.join(srcDir, 'real', 'SKILL.md'), 'real skill')
    fs.mkdirSync(path.join(srcDir, 'empty'))
    fs.mkdirSync(dstDir, { recursive: true })
    return { srcDir, dstDir }
  }

  test('links only directories containing SKILL.md', () => {
    const { srcDir, dstDir } = seedSkills()
    linkSkillDirs(srcDir, [dstDir])
    expect(fs.readlinkSync(path.join(dstDir, 'real'))).toBe(path.join(srcDir, 'real'))
    expect(fs.existsSync(path.join(dstDir, 'empty'))).toBe(false)
  })

  test('leaves orphans and .bak entries alone without --prune', () => {
    const { srcDir, dstDir } = seedSkills()
    fs.mkdirSync(path.join(dstDir, 'local-only'))
    fs.writeFileSync(path.join(dstDir, 'stray.bak-2020-01-01T00-00-00-000Z'), 'x')
    linkSkillDirs(srcDir, [dstDir])
    expect(fs.lstatSync(path.join(dstDir, 'local-only')).isSymbolicLink()).toBe(false)
    expect(fs.existsSync(path.join(dstDir, 'stray.bak-2020-01-01T00-00-00-000Z'))).toBe(true)
  })
})
