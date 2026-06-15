import matter from 'gray-matter'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { displayPath } from './path.js'
import type {
  ExternalMarkdownContext,
  ExternalMarkdownSource,
  Logger,
  ParsedMarkdown,
  ResolvedExternalMarkdown,
} from './types.js'

export function readMarkdownFile(filePath: string, root: string, logger: Logger): ParsedMarkdown | undefined {
  const raw = readSourceMarkdown(filePath, root, logger)

  if (!raw) {
    return undefined
  }

  try {
    const parsed = matter(raw)
    const result: ParsedMarkdown = {
      content: parsed.content,
    }

    if (isPlainRecord(parsed.data) && Object.keys(parsed.data).length > 0) {
      result.frontmatter = parsed.data
    }

    return result
  } catch {
    logger.warn(`Invalid Markdown frontmatter ignored: ${displayPath(root, filePath)}`)
    return {
      content: stripRawFrontmatter(raw),
    }
  }
}

function readSourceMarkdown(filePath: string, root: string, logger: Logger): string | undefined {
  try {
    return readFileSync(filePath, 'utf8')
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined

    if (code === 'ENOENT') {
      logger.warn(`External Markdown source disappeared during generation: ${displayPath(root, filePath)}`)
      return undefined
    }

    throw new Error(`Failed to read external Markdown source: ${displayPath(root, filePath)}`, {
      cause: error,
    })
  }
}

export function createContext(
  source: ExternalMarkdownSource,
  filePath: string,
  relativePath: string,
  parsed: ParsedMarkdown,
): ExternalMarkdownContext {
  const ctx: ExternalMarkdownContext = {
    source,
    filePath,
    relativePath,
    fileName: path.basename(filePath),
    dir: path.dirname(filePath),
    title: resolveTitle(parsed, filePath),
  }

  if (parsed.frontmatter) {
    ctx.frontmatter = parsed.frontmatter
  }

  return ctx
}

export function defaultResolveMarkdown(ctx: ExternalMarkdownContext): ResolvedExternalMarkdown {
  const withoutExtension = ctx.relativePath.replace(/\.md$/i, '')
  const slug = withoutExtension.replace(/\/index$/i, '')

  return {
    slug,
    title: ctx.title,
    text: ctx.title,
    order: ctx.relativePath,
    sidebar: true,
  }
}

export function renderMarkdown(content: string, frontmatter: Record<string, unknown> | undefined): string {
  const rendered = frontmatter ? matter.stringify(content, frontmatter) : content
  return rendered.endsWith('\n') ? rendered : `${rendered}\n`
}

export function mergeFrontmatter(
  sourceFrontmatter: Record<string, unknown> | undefined,
  resolverFrontmatter: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  const merged = {
    ...sourceFrontmatter,
    ...resolverFrontmatter,
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

function resolveTitle(parsed: ParsedMarkdown, filePath: string): string {
  const frontmatterTitle = parsed.frontmatter?.title

  if (typeof frontmatterTitle === 'string' && frontmatterTitle.trim()) {
    return frontmatterTitle.trim()
  }

  const h1 = parsed.content.match(/^#\s+(.+?)\s*#*\s*$/m)

  if (h1?.[1]?.trim()) {
    return h1[1].trim()
  }

  return path.basename(filePath, path.extname(filePath))
}

function stripRawFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) {
    return raw
  }

  const lines = raw.split(/\r?\n/)

  const closingIndex = lines.findIndex((line, index) => index > 0 && (line === '---' || line === '...'))

  if (closingIndex > 0) {
    return lines.slice(closingIndex + 1).join('\n')
  }

  return raw
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
