import fg from 'fast-glob'
import path from 'node:path'
import {
  createContext,
  defaultResolveMarkdown,
  mergeFrontmatter,
  readMarkdownFile,
  renderMarkdown,
} from './markdown.js'
import { compareOrderValues, compareStrings, displayPath, isInside, toPosix, trimLeadingSlash } from './path.js'
import type {
  ExternalMarkdownContext,
  ExternalMarkdownItem,
  Logger,
  MaterializedExternalMarkdownItem,
  NormalizedOptions,
  ParsedMarkdown,
  ResolvedExternalMarkdown,
} from './types.js'

export function collectExternalMarkdown(
  normalized: NormalizedOptions,
  logger: Logger,
): MaterializedExternalMarkdownItem[] {
  const items: MaterializedExternalMarkdownItem[] = []
  let matchedCount = 0

  for (const normalizedSource of normalized.sources) {
    const { source, baseDirAbs } = normalizedSource
    const filePaths = fg
      .sync(source.pattern, {
        cwd: baseDirAbs,
        absolute: true,
        onlyFiles: true,
        unique: true,
      })
      .filter((filePath) => path.extname(filePath).toLowerCase() === '.md')
      .sort(compareStrings)

    if (filePaths.length === 0) {
      logger.warn(`No external Markdown files matched source: ${source.name ?? source.baseDir}`)
    }

    matchedCount += filePaths.length

    for (const filePath of filePaths) {
      const parsed = readMarkdownFile(filePath, normalized.root, logger)
      if (!parsed) {
        continue
      }

      const relativePath = toPosix(path.relative(baseDirAbs, filePath))
      const ctx = createContext(source, filePath, relativePath, parsed)
      const resolved = normalized.resolveMarkdown?.(ctx) ?? defaultResolveMarkdown(ctx)

      if (resolved === false) {
        continue
      }

      items.push(createItem(normalized, ctx, parsed, resolved))
    }
  }

  if (matchedCount === 0) {
    logger.warn('No external Markdown files matched any configured source.')
  }

  assertNoDuplicateSlugs(normalized, items)
  assertNoDuplicateOutputPaths(normalized, items)

  return items.sort(compareItems)
}

export function toPublicItem(item: MaterializedExternalMarkdownItem): ExternalMarkdownItem {
  const publicItem: ExternalMarkdownItem = {
    filePath: item.filePath,
    relativePath: item.relativePath,
    slug: item.slug,
    fileName: item.fileName,
    link: item.link,
    title: item.title,
    text: item.text,
    order: item.order,
    sidebar: item.sidebar,
    nav: item.nav,
  }

  if (item.sourceName) {
    publicItem.sourceName = item.sourceName
  }

  if (item.frontmatter) {
    publicItem.frontmatter = item.frontmatter
  }

  return publicItem
}

function createItem(
  normalized: NormalizedOptions,
  ctx: ExternalMarkdownContext,
  parsed: ParsedMarkdown,
  resolved: ResolvedExternalMarkdown,
): MaterializedExternalMarkdownItem {
  if (!resolved.slug.trim()) {
    throw new Error(
      `External Markdown resolver returned an empty slug for ${displayPath(normalized.root, ctx.filePath)}`,
    )
  }

  const fileName = resolved.fileName ?? `${resolved.slug}.md`

  if (!fileName.trim()) {
    throw new Error(
      `External Markdown resolver returned an empty fileName for ${displayPath(normalized.root, ctx.filePath)}`,
    )
  }

  const outputPath = path.resolve(normalized.outDirAbs, fileName)

  if (!isInside(outputPath, normalized.outDirAbs)) {
    throw new Error(
      [
        'External Markdown output file must stay inside outDir.',
        `Source: ${displayPath(normalized.root, ctx.filePath)}`,
        `Output: ${displayPath(normalized.root, outputPath)}`,
      ].join('\n'),
    )
  }

  const title = resolved.title ?? ctx.title
  const text = resolved.text ?? title
  const link = resolved.link ?? `${normalized.routeBase}${trimLeadingSlash(resolved.slug)}`
  const order = resolved.order ?? text ?? ctx.relativePath
  const frontmatter = mergeFrontmatter(ctx.frontmatter, resolved.frontmatter)
  const generatedContent = renderMarkdown(parsed.content, frontmatter)

  const item: MaterializedExternalMarkdownItem = {
    filePath: ctx.filePath,
    relativePath: ctx.relativePath,
    slug: resolved.slug,
    fileName: toPosix(fileName),
    link,
    title,
    text,
    order,
    sidebar: resolved.sidebar ?? true,
    nav: resolved.nav ?? false,
    outputPath,
    generatedContent,
  }

  if (ctx.source.name) {
    item.sourceName = ctx.source.name
  }

  if (frontmatter) {
    item.frontmatter = frontmatter
  }

  return item
}

function assertNoDuplicateSlugs(normalized: NormalizedOptions, items: MaterializedExternalMarkdownItem[]): void {
  const bySlug = new Map<string, MaterializedExternalMarkdownItem[]>()

  for (const item of items) {
    const current = bySlug.get(item.slug) ?? []
    current.push(item)
    bySlug.set(item.slug, current)
  }

  const messages = [...bySlug.entries()]
    .filter(([, slugItems]) => slugItems.length > 1)
    .map(([slug, slugItems]) => {
      const files = slugItems.map((item) => `- ${displayPath(normalized.root, item.filePath)}`).join('\n')
      return `Duplicate external markdown slug: ${slug}\n${files}`
    })

  if (messages.length > 0) {
    throw new Error(messages.join('\n\n'))
  }
}

function assertNoDuplicateOutputPaths(normalized: NormalizedOptions, items: MaterializedExternalMarkdownItem[]): void {
  const byOutputPath = new Map<string, MaterializedExternalMarkdownItem[]>()

  for (const item of items) {
    const current = byOutputPath.get(item.outputPath) ?? []
    current.push(item)
    byOutputPath.set(item.outputPath, current)
  }

  const messages = [...byOutputPath.entries()]
    .filter(([, outputItems]) => outputItems.length > 1)
    .map(([outputPath, outputItems]) => {
      const files = outputItems.map((item) => `- ${displayPath(normalized.root, item.filePath)}`).join('\n')
      return `Duplicate external markdown output file: ${displayPath(normalized.root, outputPath)}\n${files}`
    })

  if (messages.length > 0) {
    throw new Error(messages.join('\n\n'))
  }
}

function compareItems(a: MaterializedExternalMarkdownItem, b: MaterializedExternalMarkdownItem): number {
  return (
    compareOrderValues(a.order, b.order) ||
    compareStrings(a.text, b.text) ||
    compareStrings(a.relativePath, b.relativePath)
  )
}
