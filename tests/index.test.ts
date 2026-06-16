import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  externalMarkdown,
  getExternalMarkdownItems,
  getExternalMarkdownNav,
  getExternalMarkdownSidebar,
  type ExternalMarkdownOptions,
} from '../src/index.js'
import { createFixture, mkdirp, runConfigResolved, write } from './helpers.js'

describe('vitepress-plugin-external-markdown', () => {
  it('resolves deterministic item, sidebar, and nav metadata from the same resolver', () => {
    const root = createFixture()
    write(root, 'packages/foo/README.md', '# Foo\n')
    write(root, 'packages/foo/CHANGELOG.md', '# Changelog\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ name: 'packages', baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
      resolveMarkdown(ctx) {
        return {
          slug: ctx.relativePath
            .replace(/\/README\.md$/, '')
            .replace(/\.md$/, '')
            .toLowerCase(),
          title: ctx.title,
          text: ctx.title,
          order: ctx.fileName === 'README.md' ? 0 : 1,
          sidebar: ctx.fileName === 'README.md',
          nav: ctx.fileName === 'README.md',
        }
      },
    }

    expect(getExternalMarkdownItems(options).map((item) => item.slug)).toEqual(['foo', 'foo/changelog'])
    expect(getExternalMarkdownSidebar(options)).toEqual([{ text: 'Foo', link: '/generated/external/foo' }])
    expect(getExternalMarkdownNav(options)).toEqual([{ text: 'Foo', link: '/generated/external/foo' }])
  })

  it('materializes generated Markdown with merged frontmatter and a marker file', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'packages/foo/README.md', '---\ntitle: Source title\naside: false\n---\n# Source title\nBody\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
      resolveMarkdown(ctx) {
        return {
          slug: 'foo',
          frontmatter: {
            title: 'Resolved title',
            layout: 'doc',
          },
          order: ctx.relativePath,
        }
      },
    }

    runConfigResolved(options, path.join(root, 'docs'))

    const outputPath = path.join(root, 'docs/src/generated/external/foo.md')
    const markerPath = path.join(root, 'docs/src/generated/external/.vitepress-plugin-external-markdown')

    expect(existsSync(markerPath)).toBe(true)
    expect(readFileSync(outputPath, 'utf8')).toMatchInlineSnapshot(`
      "---
      title: Resolved title
      aside: false
      layout: doc
      ---
      # Source title
      Body
      "
    `)
  })

  it('materializes generated Markdown when the Vite plugin is created', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src')
    write(root, 'packages/foo/README.md', '# Foo\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
      resolveMarkdown() {
        return {
          slug: 'foo',
        }
      },
    }

    expect(existsSync(path.join(root, 'docs/src/generated/external/foo.md'))).toBe(false)

    externalMarkdown(options)

    expect(existsSync(path.join(root, 'docs/src/generated/external/foo.md'))).toBe(true)
  })

  it('refuses to clean a non-empty unmanaged output directory', () => {
    const root = createFixture()
    mkdirp(root, 'docs/src/generated/external')
    write(root, 'docs/src/generated/external/manual.md', '# Manual\n')
    write(root, 'packages/foo/README.md', '# Foo\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
    }

    expect(() => runConfigResolved(options, path.join(root, 'docs'))).toThrow(
      /Refusing to use unmanaged external Markdown outDir/,
    )
  })

  it('reports duplicate slugs with all colliding source files', () => {
    const root = createFixture()
    write(root, 'packages/foo/docs/guide.md', '# Foo guide\n')
    write(root, 'packages/bar/docs/guide.md', '# Bar guide\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
      resolveMarkdown() {
        return {
          slug: 'guide',
        }
      },
    }

    expect(() => getExternalMarkdownItems(options)).toThrow(
      /Duplicate external markdown slug: guide\n- \.\.\/packages\/bar\/docs\/guide\.md\n- \.\.\/packages\/foo\/docs\/guide\.md/,
    )
  })

  it('reports duplicate output file paths independently from duplicate slugs', () => {
    const root = createFixture()
    write(root, 'packages/foo/a.md', '# A\n')
    write(root, 'packages/foo/b.md', '# B\n')

    const options: ExternalMarkdownOptions = {
      root: path.join(root, 'docs'),
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      outDir: 'generated/external',
      routeBase: '/generated/external/',
      resolveMarkdown(ctx) {
        return {
          slug: ctx.relativePath.replace(/\.md$/, ''),
          fileName: 'same.md',
        }
      },
    }

    expect(() => getExternalMarkdownItems(options)).toThrow(
      /Duplicate external markdown output file: src\/generated\/external\/same\.md/,
    )
  })

  it('warns and falls back when source frontmatter is invalid', () => {
    const root = createFixture()
    write(root, 'packages/foo/broken.md', '---\ntitle: [\n---\n# Broken\nBody\n')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const items = getExternalMarkdownItems({
        root: path.join(root, 'docs'),
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
      })

      expect(items[0]?.title).toBe('Broken')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid Markdown frontmatter ignored'))
    } finally {
      warn.mockRestore()
    }
  })
})
