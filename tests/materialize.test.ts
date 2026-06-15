import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { materializeExternalMarkdown } from '../src/materialize.js'
import { createFixture, createLogger, mkdirp, write } from './helpers.js'

describe('materializeExternalMarkdown', () => {
  it('cleans an existing managed directory before writing generated files', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src/generated/external')
    write(root, 'docs/src/generated/external/.vitepress-plugin-external-markdown', 'vitepress:external-markdown\n')
    write(root, 'docs/src/generated/external/stale.md', '# Stale\n')
    write(root, 'packages/foo/README.md', '# Foo\n')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(existsSync(path.join(root, 'docs/src/generated/external/stale.md'))).toBe(false)
    expect(readFileSync(path.join(root, 'docs/src/generated/external/foo.md'), 'utf8')).toBe('# Foo\n')
  })

  it('keeps existing managed files when clean is false', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src/generated/external')
    write(root, 'docs/src/generated/external/.vitepress-plugin-external-markdown', 'vitepress:external-markdown\n')
    write(root, 'docs/src/generated/external/manual.md', '# Manual\n')
    write(root, 'packages/foo/README.md', '# Foo\n')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        clean: false,
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(readFileSync(path.join(root, 'docs/src/generated/external/manual.md'), 'utf8')).toBe('# Manual\n')
    expect(readFileSync(path.join(root, 'docs/src/generated/external/foo.md'), 'utf8')).toBe('# Foo\n')
  })
})
