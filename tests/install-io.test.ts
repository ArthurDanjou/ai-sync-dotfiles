import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  getTargets,
  installTextFile,
  readJsonSafe,
  writeJson,
} from '../scripts/setup/install'
import { makeTempDir } from './helpers'

const temps: string[] = []
afterEach(() => {
  for (const root of temps.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

// writeJson and installTextFile chat on stdout, keep the output clean.
const originalLog = console.log
beforeEach(() => {
  console.log = () => {}
})
afterEach(() => {
  console.log = originalLog
})

describe('getTargets', () => {
  test('every target lives under HOME', () => {
    const home = process.env.HOME ?? ''
    const targets = getTargets()
    expect(Object.keys(targets).length).toBeGreaterThan(0)
    for (const target of Object.values(targets)) {
      expect(target.startsWith(home), `${target} escapes HOME`).toBe(true)
    }
  })
})

describe('readJsonSafe', () => {
  test('reads valid JSONC with comments and trailing commas', () => {
    const dir = makeTempDir('readjson')
    temps.push(dir)
    const file = path.join(dir, 'a.jsonc')
    fs.writeFileSync(file, '{ // comment\n"a": 1, }')
    expect(readJsonSafe(file)).toEqual({ data: { a: 1 }, missing: false, corrupt: false })
  })

  test('reports missing and corrupt files without throwing', () => {
    const dir = makeTempDir('readjson')
    temps.push(dir)
    const corrupt = path.join(dir, 'bad.json')
    fs.writeFileSync(corrupt, '{oops')
    expect(readJsonSafe(path.join(dir, 'absent.json')).missing).toBe(true)
    expect(readJsonSafe(corrupt).corrupt).toBe(true)
  })
})

describe('writeJson', () => {
  test('writes, skips unchanged content, and backs up replaced files', () => {
    const dir = makeTempDir('writejson')
    temps.push(dir)
    const file = path.join(dir, 'sub', 'config.json')

    writeJson(file, { a: 1 })
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({ a: 1 })

    writeJson(file, { a: 1 })
    expect(fs.readdirSync(path.join(dir, 'sub'))).toEqual(['config.json'])

    writeJson(file, { a: 2 })
    const entries = fs.readdirSync(path.join(dir, 'sub'))
    expect(entries).toHaveLength(2)
    const bak = entries.find(f => f.startsWith('config.json.bak-'))
    expect(bak, 'replaced content should leave a backup').toBeTruthy()
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'sub', bak!), 'utf-8'))).toEqual({ a: 1 })
  })

  test('replaces symlinks with regular files to protect the repo', () => {
    const dir = makeTempDir('writejson')
    temps.push(dir)
    const target = path.join(dir, 'target.json')
    const link = path.join(dir, 'link.json')
    fs.writeFileSync(target, '{}')
    fs.symlinkSync(target, link)
    writeJson(link, { a: 1 })
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(false)
    expect(JSON.parse(fs.readFileSync(link, 'utf-8'))).toEqual({ a: 1 })
  })
})

describe('installTextFile', () => {
  test('copies changed files, skips identical ones, warns on missing sources', () => {
    const dir = makeTempDir('textfile')
    temps.push(dir)
    const src = path.join(dir, 'src.md')
    const dst = path.join(dir, 'dst.md')
    fs.writeFileSync(src, 'v2')
    fs.writeFileSync(dst, 'v1')

    installTextFile(src, dst)
    expect(fs.readFileSync(dst, 'utf-8')).toBe('v2')
    expect(fs.readdirSync(dir).some(f => f.startsWith('dst.md.bak-'))).toBe(true)

    installTextFile(src, dst)
    expect(fs.readdirSync(dir).filter(f => f.startsWith('dst.md.bak-'))).toHaveLength(1)

    installTextFile(path.join(dir, 'absent.md'), path.join(dir, 'new.md'))
    expect(fs.existsSync(path.join(dir, 'new.md'))).toBe(false)
  })
})
