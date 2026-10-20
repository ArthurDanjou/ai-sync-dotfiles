import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_REMOTE_TARGETS,
  REMOTE_DIR,
  TAR_EXCLUDES,
  buildRemoteCommand,
  parseServerArgs,
  tarCreateArgs,
} from '../scripts/setup/install-server'

describe('parseServerArgs', () => {
  test('defaults to opencode, claudeCode and codex', () => {
    expect(parseServerArgs(['user@host'])).toEqual({
      dest: 'user@host',
      targets: [...DEFAULT_REMOTE_TARGETS],
    })
  })

  test('explicit targets are used as given', () => {
    expect(parseServerArgs(['my-alias', 'zed', 'opencode'])).toEqual({
      dest: 'my-alias',
      targets: ['zed', 'opencode'],
    })
  })

  test('a missing or flag-like destination is rejected', () => {
    expect(() => parseServerArgs([])).toThrow()
    expect(() => parseServerArgs(['-v'])).toThrow()
  })

  test('unknown and Mac-only targets are rejected', () => {
    expect(() => parseServerArgs(['user@host', 'nope'])).toThrow('Unknown target')
    expect(() => parseServerArgs(['user@host', 'claude'])).toThrow('Unknown target')
    expect(() => parseServerArgs(['user@host', 'lmstudio'])).toThrow('Unknown target')
  })
})

describe('tarCreateArgs', () => {
  test('every exclude pattern rides a --exclude flag', () => {
    const args = tarCreateArgs('/tmp/out.tar.gz')
    expect(args[0]).toBe('-czf')
    expect(args[1]).toBe('/tmp/out.tar.gz')
    // ustar has no extended headers, so remote GNU tar stays silent
    // about macOS xattrs.
    expect(args).toContain('--format')
    expect(args[args.indexOf('--format') + 1]).toBe('ustar')
    // Without the flag, tar treats the pattern as a file to archive
    // and fails on the ones that do not exist.
    const flagIndexes = args.flatMap((arg, i) => (arg === '--exclude' ? [i] : []))
    expect(flagIndexes).toHaveLength(TAR_EXCLUDES.length)
    for (const i of flagIndexes) {
      expect(TAR_EXCLUDES).toContain(args[i + 1])
    }
    expect(args.at(-3)).toBe('-C')
    expect(args.at(-1)).toBe('.')
  })
})

describe('buildRemoteCommand', () => {
  test('points at the remote checkout with user scope for Claude Code', () => {
    const cmd = buildRemoteCommand(['opencode', 'claudeCode'])
    expect(cmd).toContain(`cd ~/${REMOTE_DIR}`)
    expect(cmd).toContain('bun scripts/setup/install.ts opencode claudeCode')
    expect(cmd).toContain('DOTFILES_CLAUDE_CODE_USER_SCOPE=1')
    expect(cmd).toContain('.bun/bin')
  })
})
