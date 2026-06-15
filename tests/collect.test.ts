import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectExternalMarkdown } from '../src/collect.js'
import { normalizeOptions } from '../src/normalize.js'
import { createFixture, createLogger, write } from './helpers.js'

describe('collectExternalMarkdown', () => {
  it('skips files when the resolver returns false', () => {
    const root = createFixture()
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/private.md', '# Private\n')
    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        resolveMarkdown(ctx) {
          if (ctx.fileName === 'private.md') {
            return false
          }

          return {
            slug: 'foo',
          }
        },
      },
      path.join(root, 'docs'),
    )

    expect(collectExternalMarkdown(normalized, createLogger()).map((item) => item.slug)).toEqual(['foo'])
  })

  it('sorts deterministically by order, text, then relativePath', () => {
    const root = createFixture()
    write(root, 'packages/foo/c.md', '# C\n')
    write(root, 'packages/foo/a.md', '# A\n')
    write(root, 'packages/foo/b.md', '# B\n')
    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        resolveMarkdown(ctx) {
          return {
            slug: ctx.relativePath.replace(/\.md$/, ''),
            text: ctx.fileName === 'b.md' ? 'Alpha' : 'Same',
            order: ctx.fileName === 'c.md' ? 2 : 1,
          }
        },
      },
      path.join(root, 'docs'),
    )

    expect(collectExternalMarkdown(normalized, createLogger()).map((item) => item.fileName)).toEqual([
      'foo/b.md',
      'foo/a.md',
      'foo/c.md',
    ])
  })

  it('rejects generated file paths that leave outDir', () => {
    const root = createFixture()
    write(root, 'packages/foo/README.md', '# Foo\n')
    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        resolveMarkdown() {
          return {
            slug: 'foo',
            fileName: '../foo.md',
          }
        },
      },
      path.join(root, 'docs'),
    )

    expect(() => collectExternalMarkdown(normalized, createLogger())).toThrow(/output file must stay inside outDir/)
  })

  it('warns when no files match a source', () => {
    const root = createFixture()
    write(root, 'packages/foo/not-markdown.txt', 'Nope\n')
    const logger = createLogger()
    const normalized = normalizeOptions(
      {
        sources: [{ name: 'packages', baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
      },
      path.join(root, 'docs'),
    )

    expect(collectExternalMarkdown(normalized, logger)).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith('No external Markdown files matched source: packages')
    expect(logger.warn).toHaveBeenCalledWith('No external Markdown files matched any configured source.')
  })
})
