import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MUST_BE_IGNORED, scanText, TOKEN_PATTERNS } from '../scripts/setup/audit'
import { repoPath } from './helpers'

describe('scanText', () => {
  // scanText reports hits on stderr, silence it while these tests run.
  const originalError = console.error
  beforeEach(() => {
    console.error = () => {}
  })
  afterEach(() => {
    console.error = originalError
  })

  test('flags long token patterns', () => {
    // Tokens are built at runtime so no literal secret ever lands in git.
    expect(scanText('t', `key = "ghp_${'1'.repeat(20)}"`)).toBe(true)
    expect(scanText('t', `key = "sk-ant-${'a'.repeat(15)}"`)).toBe(true)
  })

  test('ignores placeholders and clean text', () => {
    expect(scanText('t', 'key = "ghp_xxx"')).toBe(false)
    expect(scanText('t', 'nothing secret here')).toBe(false)
  })

  test('every pattern is a valid regular expression', () => {
    for (const pattern of TOKEN_PATTERNS) {
      expect(() => new RegExp(pattern.source)).not.toThrow()
    }
  })
})

describe('repo ignore rules', () => {
  test('every secret-bearing path is git-ignored', () => {
    for (const entry of MUST_BE_IGNORED) {
      let ignored = false
      try {
        execFileSync('git', ['check-ignore', '-q', entry], { cwd: repoPath() })
        ignored = true
      } catch {
        ignored = false
      }
      expect(ignored, `${entry} must be ignored`).toBe(true)
    }
  })

  test('the audit hook runs the audit script', () => {
    const hook = fs.readFileSync(repoPath('hooks', 'pre-push'), 'utf-8')
    expect(hook).toContain('bun run audit')
  })
})

describe('audit CLI in a scratch git repo', () => {
  function initRepo(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-repo-'))
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
    git('init', '-q')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'test')
    fs.writeFileSync(path.join(dir, '.gitignore'), `${MUST_BE_IGNORED.join('\n')}\n`)
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content)
    }
    git('add', '-A')
    git('commit', '-qm', 'fixture')
    return dir
  }

  function runAudit(cwd: string): { status: number; output: string } {
    const result = spawnSync('bun', [repoPath('scripts', 'setup', 'audit.ts')], {
      cwd,
      encoding: 'utf-8',
    })
    return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
  }

  test('fails when a tracked file or history contains a secret', () => {
    const token = `ghp_${'12345678901234567890abcdef'}`
    const dir = initRepo({ 'leak.txt': `token = "${token}"\n` })
    try {
      const { status, output } = runAudit(dir)
      expect(status).not.toBe(0)
      expect(output).toContain('possible secret')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('passes a clean repo', () => {
    const dir = initRepo({ 'ok.txt': 'nothing secret here\n' })
    try {
      const { status, output } = runAudit(dir)
      expect(output).toContain('audit: clean')
      expect(status).toBe(0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('test fixtures contain no literal secrets', () => {
    const dir = repoPath('tests')
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      for (const pattern of TOKEN_PATTERNS) {
        expect(pattern.test(content), `${file} matches ${pattern}`).toBe(false)
      }
    }
  })
})
