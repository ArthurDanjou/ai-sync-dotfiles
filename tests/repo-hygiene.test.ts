import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { repoPath } from './helpers'

function isExecutable(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

describe('repo hygiene', () => {
  test('bootstrap and the git hook are executable', () => {
    expect(isExecutable(repoPath('bootstrap.sh'))).toBe(true)
    expect(isExecutable(repoPath('hooks', 'pre-push'))).toBe(true)
  })

  test('package.json exposes the documented scripts', () => {
    const pkg = JSON.parse(fs.readFileSync(repoPath('package.json'), 'utf-8'))
    for (const script of ['build', 'typecheck', 'audit', 'test', 'clean', 'check']) {
      expect(typeof pkg.scripts[script], `missing script ${script}`).toBe('string')
    }
  })

  test('tsconfig covers scripts and tests', () => {
    const tsconfig = JSON.parse(fs.readFileSync(repoPath('tsconfig.json'), 'utf-8'))
    expect(tsconfig.include).toContain('scripts/**/*.ts')
    expect(tsconfig.include).toContain('tests/**/*.ts')
  })

  test('a CI workflow runs the checks on every push', () => {
    const dir = repoPath('.github', 'workflows')
    const workflows = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    expect(workflows.length).toBeGreaterThan(0)
    const triggersPush = workflows.some(f =>
      fs.readFileSync(`${dir}/${f}`, 'utf-8').includes('push'),
    )
    expect(triggersPush).toBe(true)
  })

  test('every CI run step maps to a real package script', () => {
    const pkg = JSON.parse(fs.readFileSync(repoPath('package.json'), 'utf-8'))
    const dir = repoPath('.github', 'workflows')
    const workflows = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    const runs: string[] = []
    for (const file of workflows) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      for (const match of content.matchAll(/^\s*-\s*run:\s*(.+)$/gm)) runs.push(match[1].trim())
    }
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) {
      const script = run.match(/^bun run (\S+)/)?.[1]
      if (script) expect(typeof pkg.scripts[script], `CI calls unknown script ${script}`).toBe('string')
      else expect(['bun install', 'bun test'].includes(run), `unexpected CI step ${run}`).toBe(true)
    }
  })
})
