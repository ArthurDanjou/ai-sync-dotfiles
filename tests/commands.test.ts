import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { repoPath } from './helpers'

function commandFiles(): string[] {
  const dir = repoPath('scripts', 'commands')
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => path.join(dir, f))
}

describe('shared command templates', () => {
  test('at least one command exists', () => {
    expect(commandFiles().length).toBeGreaterThan(0)
  })

  test('every command has a description frontmatter and a non-empty body', () => {
    for (const file of commandFiles()) {
      const content = fs.readFileSync(file, 'utf-8')
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      expect(match, `${file} needs YAML frontmatter`).toBeTruthy()
      expect(match![1]).toMatch(/description:\s*\S/)
      expect(match![2].trim().length, `${file} needs a body`).toBeGreaterThan(0)
    }
  })

  test('commands use the shared $ARGUMENTS placeholder, not foreign syntax', () => {
    for (const file of commandFiles()) {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content.includes('{{args}}'), `${file} must use $ARGUMENTS`).toBe(false)
    }
  })
})
