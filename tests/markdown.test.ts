import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createContext,
  defaultResolveMarkdown,
  mergeFrontmatter,
  readMarkdownFile,
  renderMarkdown,
} from '../src/markdown.js'
import { createFixture, createLogger, write } from './helpers.js'

describe('markdown helpers', () => {
  it('parses frontmatter and prefers frontmatter title over the first h1', () => {
    const root = createFixture()
    const filePath = write(root, 'packages/foo/README.md', '---\ntitle: Frontmatter title\n---\n# H1 title\n')

    const parsed = readMarkdownFile(filePath, root, createLogger())
    expect(parsed).toEqual({
      content: '# H1 title\n',
      frontmatter: {
        title: 'Frontmatter title',
      },
    })

    expect(createContext({ baseDir: 'packages', pattern: '**/*.md' }, filePath, 'foo/README.md', parsed!).title).toBe(
      'Frontmatter title',
    )
  })

  it('falls back from h1 title to the file base name', () => {
    const root = createFixture()
    const h1FilePath = write(root, 'packages/foo/guide.md', '# Guide\nBody\n')
    const noTitleFilePath = write(root, 'packages/foo/changelog.md', 'Body only\n')

    const h1Parsed = readMarkdownFile(h1FilePath, root, createLogger())
    const noTitleParsed = readMarkdownFile(noTitleFilePath, root, createLogger())

    expect(
      createContext({ baseDir: 'packages', pattern: '**/*.md' }, h1FilePath, 'foo/guide.md', h1Parsed!).title,
    ).toBe('Guide')
    expect(
      createContext({ baseDir: 'packages', pattern: '**/*.md' }, noTitleFilePath, 'foo/changelog.md', noTitleParsed!)
        .title,
    ).toBe('changelog')
  })

  it('strips invalid raw frontmatter, warns, and keeps the body readable', () => {
    const root = createFixture()
    const filePath = write(root, 'packages/foo/broken.md', '---\ntitle: [\n---\n# Broken\nBody\n')
    const logger = createLogger()

    expect(readMarkdownFile(filePath, root, logger)).toEqual({
      content: '# Broken\nBody\n',
    })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid Markdown frontmatter ignored'))
  })

  it('creates default metadata from relative paths', () => {
    const root = createFixture()
    const filePath = path.join(root, 'packages/foo/docs/index.md')

    expect(
      defaultResolveMarkdown({
        source: { baseDir: 'packages', pattern: '**/*.md' },
        filePath,
        relativePath: 'foo/docs/index.md',
        fileName: 'index.md',
        dir: path.dirname(filePath),
        title: 'Docs',
      }),
    ).toEqual({
      slug: 'foo/docs',
      title: 'Docs',
      text: 'Docs',
      order: 'foo/docs/index.md',
      sidebar: true,
    })
  })

  it('merges resolver frontmatter over source frontmatter and renders a single frontmatter block', () => {
    const frontmatter = mergeFrontmatter(
      {
        title: 'Source',
        aside: false,
      },
      {
        title: 'Resolved',
        layout: 'doc',
      },
    )

    expect(frontmatter).toEqual({
      title: 'Resolved',
      aside: false,
      layout: 'doc',
    })
    expect(renderMarkdown('# Body', frontmatter)).toMatchInlineSnapshot(`
      "---
      title: Resolved
      aside: false
      layout: doc
      ---
      # Body
      "
    `)
  })
})
