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

  it('copies configured assets while preserving paths relative to the asset baseDir', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/images/logo.png', 'logo')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../packages/foo',
            pattern: 'images/**/*',
            outDir: 'generated/external',
          },
        ],
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(readFileSync(path.join(root, 'docs/src/generated/external/images/logo.png'), 'utf8')).toBe('logo')
    expect(readFileSync(path.join(root, 'docs/src/generated/external/foo.md'), 'utf8')).toBe('# Foo\n')
  })

  it('copies assets matched by string array patterns', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/images/logo.png', 'logo')
    write(root, 'packages/foo/files/manual.pdf', 'manual')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../packages/foo',
            pattern: ['images/**/*', 'files/**/*'],
            outDir: 'generated/assets',
          },
        ],
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(readFileSync(path.join(root, 'docs/src/generated/assets/images/logo.png'), 'utf8')).toBe('logo')
    expect(readFileSync(path.join(root, 'docs/src/generated/assets/files/manual.pdf'), 'utf8')).toBe('manual')
  })

  it('cleans managed asset output before copying', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src/generated/assets')
    write(root, 'docs/src/generated/assets/.vitepress-plugin-external-markdown', 'vitepress:external-markdown\n')
    write(root, 'docs/src/generated/assets/stale.png', 'stale')
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/images/logo.png', 'logo')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../packages/foo',
            pattern: 'images/**/*',
            outDir: 'generated/assets',
          },
        ],
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(existsSync(path.join(root, 'docs/src/generated/assets/stale.png'))).toBe(false)
    expect(readFileSync(path.join(root, 'docs/src/generated/assets/images/logo.png'), 'utf8')).toBe('logo')
  })

  it('refuses to clean a non-empty unmanaged asset output directory', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src/generated/assets')
    write(root, 'docs/src/generated/assets/manual.png', 'manual')
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/images/logo.png', 'logo')

    expect(() =>
      materializeExternalMarkdown(
        {
          root: path.join(root, 'docs'),
          sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
          outDir: 'generated/external',
          routeBase: '/generated/external/',
          copyAssets: [
            {
              baseDir: '../packages/foo',
              pattern: 'images/**/*',
              outDir: 'generated/assets',
            },
          ],
          resolveMarkdown: () => ({ slug: 'foo' }),
        },
        {
          root: path.join(root, 'docs'),
          logger: createLogger(),
        },
      ),
    ).toThrow(/Refusing to use unmanaged external asset outDir/)

    expect(readFileSync(path.join(root, 'docs/src/generated/assets/manual.png'), 'utf8')).toBe('manual')
  })

  it('copies top-level asset directories when copyAssets outDir is srcDir', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/public/logo.png', 'logo')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../packages/foo',
            pattern: 'public/**/*',
            outDir: '.',
          },
        ],
        resolveMarkdown: () => ({ slug: 'foo' }),
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(readFileSync(path.join(root, 'docs/src/public/logo.png'), 'utf8')).toBe('logo')
  })

  it('copies assets without Markdown sources', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'assets/images/logo.png', 'logo')

    materializeExternalMarkdown(
      {
        root: path.join(root, 'docs'),
        sources: [],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../assets',
            pattern: 'images/**/*',
            outDir: 'generated/assets',
          },
        ],
      },
      {
        root: path.join(root, 'docs'),
        logger: createLogger(),
      },
    )

    expect(readFileSync(path.join(root, 'docs/src/generated/assets/images/logo.png'), 'utf8')).toBe('logo')
    expect(existsSync(path.join(root, 'docs/src/generated/external'))).toBe(false)
  })
})
