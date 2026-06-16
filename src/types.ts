export type ExternalMarkdownOptions = {
  /**
   * VitePress project root. Defaults to process.cwd(). Set this when running
   * VitePress commands from outside the VitePress project root.
   */
  root?: string

  /**
   * srcDir relative to the VitePress project root.
   *
   * @default 'src'
   */
  srcDir?: string

  /**
   * External Markdown source definitions.
   */
  sources: ExternalMarkdownSource[]

  /**
   * Generated output directory relative to srcDir.
   */
  outDir: string

  /**
   * VitePress route prefix for generated pages.
   */
  routeBase: string

  /**
   * Whether to clean generated output before regeneration.
   *
   * @default true
   */
  clean?: boolean

  /**
   * External asset copy definitions. Assets are copied independently from
   * Markdown generation and links are not rewritten.
   */
  copyAssets?: ExternalAssetCopy[]

  /**
   * Convert a discovered Markdown file into generated page metadata.
   */
  resolveMarkdown?: (ctx: ExternalMarkdownContext) => ResolvedExternalMarkdown | false
}

export type ExternalMarkdownSource = {
  /**
   * Source base directory relative to the VitePress project root.
   */
  baseDir: string

  /**
   * Glob pattern under baseDir.
   */
  pattern: string

  /**
   * Optional source name for grouping and debugging.
   */
  name?: string
}

export type ExternalAssetCopy = {
  /**
   * Asset base directory relative to the VitePress project root.
   */
  baseDir: string

  /**
   * Glob pattern or patterns under baseDir.
   */
  pattern: string | string[]

  /**
   * Asset output directory relative to srcDir.
   */
  outDir: string

  /**
   * Whether to clean the managed asset output before copying.
   *
   * @default true
   */
  clean?: boolean
}

export type ExternalMarkdownContext = {
  source: ExternalMarkdownSource
  filePath: string
  relativePath: string
  fileName: string
  dir: string
  frontmatter?: Record<string, unknown>
  title: string
}

export type ResolvedExternalMarkdown = {
  slug: string
  title?: string
  text?: string
  fileName?: string
  link?: string
  order?: string | number
  sidebar?: boolean
  nav?: boolean
  frontmatter?: Record<string, unknown>
}

export type ExternalMarkdownItem = {
  sourceName?: string
  filePath: string
  relativePath: string
  slug: string
  fileName: string
  link: string
  title: string
  text: string
  order: string | number
  sidebar: boolean
  nav: boolean
  frontmatter?: Record<string, unknown>
}

export type ExternalMarkdownSidebarItem = {
  text: string
  link: string
}

export type ExternalMarkdownNavItem = {
  text: string
  link: string
}

export type Logger = {
  warn: (message: string) => void
}

export type NormalizedOptions = {
  root: string
  srcDir: string
  srcDirAbs: string
  outDir: string
  outDirAbs: string
  routeBase: string
  clean: boolean
  sources: NormalizedSource[]
  copyAssets: NormalizedAssetCopy[]
  resolveMarkdown?: (ctx: ExternalMarkdownContext) => ResolvedExternalMarkdown | false
}

export type NormalizedSource = {
  source: ExternalMarkdownSource
  baseDirAbs: string
}

export type NormalizedAssetCopy = {
  asset: ExternalAssetCopy
  baseDirAbs: string
  outDirAbs: string
  clean: boolean
}

export type ParsedMarkdown = {
  content: string
  frontmatter?: Record<string, unknown>
}

export type MaterializedExternalMarkdownItem = ExternalMarkdownItem & {
  outputPath: string
  generatedContent: string
}

export type MaterializedExternalAssetItem = {
  filePath: string
  relativePath: string
  outputPath: string
  managedDirAbs: string
  clean: boolean
}
