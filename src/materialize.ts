import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { MARKER_FILE_NAME, PLUGIN_NAME } from './constants.js'
import { collectExternalMarkdown, toPublicItem } from './collect.js'
import { normalizeOptions } from './normalize.js'
import { displayPath } from './path.js'
import type { ExternalMarkdownItem, ExternalMarkdownOptions, Logger, NormalizedOptions } from './types.js'

export function materializeExternalMarkdown(
  options: ExternalMarkdownOptions,
  runtime: { root: string; logger: Logger },
): ExternalMarkdownItem[] {
  const normalized = normalizeOptions(options, runtime.root)
  const items = collectExternalMarkdown(normalized, runtime.logger)
  prepareGeneratedDirectory(normalized)

  for (const item of items) {
    try {
      mkdirSync(path.dirname(item.outputPath), { recursive: true })
      writeFileSync(item.outputPath, item.generatedContent)
    } catch (error) {
      throw new Error(`Failed to write generated Markdown: ${displayPath(normalized.root, item.outputPath)}`, {
        cause: error,
      })
    }
  }

  return items.map((item) => toPublicItem(item))
}

function prepareGeneratedDirectory(normalized: NormalizedOptions): void {
  const markerPath = path.join(normalized.outDirAbs, MARKER_FILE_NAME)

  if (existsSync(normalized.outDirAbs)) {
    const stat = statSync(normalized.outDirAbs)

    if (!stat.isDirectory()) {
      throw new Error(
        `externalMarkdown outDir exists but is not a directory: ${displayPath(normalized.root, normalized.outDirAbs)}`,
      )
    }

    const entries = readdirSync(normalized.outDirAbs)
    const hasMarker = existsSync(markerPath)

    if (!hasMarker && entries.length > 0) {
      throw new Error(
        [
          'Refusing to use unmanaged external Markdown outDir.',
          `Directory: ${displayPath(normalized.root, normalized.outDirAbs)}`,
          `Expected marker file: ${MARKER_FILE_NAME}`,
        ].join('\n'),
      )
    }

    if (normalized.clean) {
      if (!hasMarker && entries.length > 0) {
        throw new Error(`Refusing to clean unmanaged outDir: ${displayPath(normalized.root, normalized.outDirAbs)}`)
      }

      rmSync(normalized.outDirAbs, { recursive: true, force: true })
    }
  }

  mkdirSync(normalized.outDirAbs, { recursive: true })
  writeFileSync(markerPath, `${PLUGIN_NAME}\n`)
}
