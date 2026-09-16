import { beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { makeTempDir, repoPath, repoRoot } from './helpers'

const installScript = repoPath('scripts', 'setup', 'install.ts')

beforeAll(() => {
  execFileSync('bun', ['run', 'build'], { cwd: repoRoot, stdio: 'pipe' })
})

function freshHome(): string {
  return makeTempDir('install-home')
}

function runInstall(home: string, ...targets: string[]): { status: number; output: string } {
  const result = spawnSync('bun', [installScript, ...targets], {
    cwd: repoRoot,
    env: { ...process.env, HOME: home },
    encoding: 'utf-8',
  })
  return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

describe('zed installer', () => {
  test('seeds settings and merges managed servers', () => {
    const home = freshHome()
    const { status } = runInstall(home, 'zed')
    expect(status).toBe(0)
    const settings = readJson(path.join(home, '.config', 'zed', 'settings.json'))
    expect(Object.keys(settings.context_servers)).toContain('fetch')
  })

  test('second run is idempotent and local servers survive', () => {
    const home = freshHome()
    const settingsPath = path.join(home, '.config', 'zed', 'settings.json')
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({ context_servers: { mine: { command: 'keep' } }, theme: 'mine' }),
    )
    expect(runInstall(home, 'zed').status).toBe(0)
    const once = readJson(settingsPath)
    expect(once.context_servers.mine).toEqual({ command: 'keep' })
    expect(once.context_servers.fetch).toBeTruthy()
    expect(once.theme).toBe('mine')

    const second = runInstall(home, 'zed')
    expect(second.status).toBe(0)
    expect(second.output).toContain('unchanged')
  })

  test('corrupt configs fail without writing anything', () => {
    const home = freshHome()
    const settingsPath = path.join(home, '.config', 'zed', 'settings.json')
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, '{corrupt')
    const { status } = runInstall(home, 'zed')
    expect(status).not.toBe(0)
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe('{corrupt')
  })
})

describe('codex installer', () => {
  test('replaces managed blocks and preserves custom sections', () => {
    const home = freshHome()
    const configPath = path.join(home, '.codex', 'config.toml')
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(
      configPath,
      ['custom = true', '', '[mcp_servers.custom]', 'command = "keep"', '', '[mcp_servers.fetch]', 'command = "old"'].join('\n'),
    )
    expect(runInstall(home, 'codex').status).toBe(0)
    const merged = fs.readFileSync(configPath, 'utf-8')
    expect(merged).toContain('custom = true')
    expect(merged).toContain('[mcp_servers.custom]\ncommand = "keep"')
    expect(merged).not.toContain('"old"')
    expect(merged).toContain('# Managed by dotfiles')
  })
})

describe('claude code installer', () => {
  test('writes servers under the project entry and merges settings', () => {
    const home = freshHome()
    expect(runInstall(home, 'claudeCode').status).toBe(0)
    const claudeJson = readJson(path.join(home, '.claude.json'))
    expect(Object.keys(claudeJson.projects[repoRoot].mcpServers)).toContain('fetch')
    const template = readJson(repoPath('config', 'claude', 'settings.json'))
    const settings = readJson(path.join(home, '.claude', 'settings.json'))
    for (const key of Object.keys(template)) {
      expect(settings, `settings key ${key} missing`).toHaveProperty(key)
    }
  })
})

describe('full install', () => {
  test('every platform lands and instructions deploy', () => {
    const home = freshHome()
    expect(runInstall(home).status).toBe(0)
    const expected = [
      path.join(home, '.config', 'zed', 'settings.json'),
      path.join(home, 'Library', 'Application Support', 'Claude Desktop', 'claude_desktop_config.json'),
      path.join(home, '.claude.json'),
      path.join(home, '.config', 'opencode', 'opencode.jsonc'),
      path.join(home, '.codex', 'config.toml'),
      path.join(home, '.lmstudio', 'mcp.json'),
    ]
    for (const file of expected) {
      expect(fs.existsSync(file), `missing ${file}`).toBe(true)
    }
    const instructions = fs.readFileSync(repoPath('scripts', 'instructions.md'), 'utf-8')
    expect(fs.readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf-8')).toBe(instructions)
    expect(fs.readFileSync(path.join(home, '.config', 'opencode', 'AGENTS.md'), 'utf-8')).toBe(instructions)
  })

  test('unknown targets are rejected', () => {
    const { status, output } = runInstall(freshHome(), 'nope')
    expect(status).not.toBe(0)
    expect(output).toContain('Unknown target')
  })
})
