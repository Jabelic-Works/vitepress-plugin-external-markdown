import fg from 'fast-glob'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { MARKER_FILE_NAME, PLUGIN_NAME } from './constants.js'
import { collectExternalMarkdown, toPublicItem } from './collect.js'
import { normalizeOptions } from './normalize.js'
import { compareStrings, displayPath, isInside, toPosix } from './path.js'
import type {
  ExternalMarkdownItem,
  ExternalMarkdownOptions,
  Logger,
  MaterializedExternalAssetItem,
  NormalizedAssetCopy,
  NormalizedOptions,
} from './types.js'

type ManagedDirectory = {
  dirAbs: string
  clean: boolean
  label: string
}

export function materializeExternalMarkdown(
  options: ExternalMarkdownOptions,
  runtime: { root: string; logger: Logger },
): ExternalMarkdownItem[] {
  const normalized = normalizeOptions(options, runtime.root)
  const items = collectExternalMarkdown(normalized, runtime.logger)
  const assets = collectExternalAssets(normalized, runtime.logger)
  const managedDirectories = collectManagedDirectories(normalized, assets)

  for (const managedDirectory of managedDirectories) {
    prepareManagedDirectory(normalized, managedDirectory)
  }

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

  for (const asset of assets) {
    try {
      mkdirSync(path.dirname(asset.outputPath), { recursive: true })
      copyFileSync(asset.filePath, asset.outputPath)
    } catch (error) {
      throw new Error(`Failed to copy external asset: ${displayPath(normalized.root, asset.outputPath)}`, {
        cause: error,
      })
    }
  }

  return items.map((item) => toPublicItem(item))
}

function collectExternalAssets(normalized: NormalizedOptions, logger: Logger): MaterializedExternalAssetItem[] {
  return normalized.copyAssets.flatMap((asset) => collectAssetFiles(normalized, logger, asset)).sort(compareAssets)
}

function collectAssetFiles(
  normalized: NormalizedOptions,
  logger: Logger,
  normalizedAsset: NormalizedAssetCopy,
): MaterializedExternalAssetItem[] {
  const { asset, baseDirAbs } = normalizedAsset
  const filePaths = fg
    .sync(asset.pattern, {
      cwd: baseDirAbs,
      absolute: true,
      onlyFiles: true,
      unique: true,
    })
    .sort(compareStrings)

  if (filePaths.length === 0) {
    logger.warn(`No external asset files matched source: ${asset.baseDir}`)
  }

  return filePaths.map((filePath) => createAssetItem(normalized, normalizedAsset, filePath))
}

function createAssetItem(
  normalized: NormalizedOptions,
  normalizedAsset: NormalizedAssetCopy,
  filePath: string,
): MaterializedExternalAssetItem {
  const relativePath = toPosix(path.relative(normalizedAsset.baseDirAbs, filePath))
  const outputPath = path.resolve(normalizedAsset.outDirAbs, relativePath)

  if (!isInside(outputPath, normalizedAsset.outDirAbs)) {
    throw new Error(
      [
        'External asset output file must stay inside copyAssets.outDir.',
        `Source: ${displayPath(normalized.root, filePath)}`,
        `Output: ${displayPath(normalized.root, outputPath)}`,
      ].join('\n'),
    )
  }

  return {
    filePath,
    relativePath,
    outputPath,
    managedDirAbs: resolveAssetManagedDirectory(normalized, normalizedAsset, relativePath),
    clean: normalizedAsset.clean,
  }
}

function resolveAssetManagedDirectory(
  normalized: NormalizedOptions,
  normalizedAsset: NormalizedAssetCopy,
  relativePath: string,
): string {
  if (normalizedAsset.outDirAbs !== normalized.srcDirAbs) {
    return normalizedAsset.outDirAbs
  }

  const [firstSegment] = relativePath.split('/')

  if (!firstSegment || firstSegment === relativePath) {
    throw new Error(
      [
        'externalMarkdown copyAssets with outDir "." must match files inside a directory.',
        `File: ${relativePath}`,
        'Use a nested pattern such as "public/**/*", set a narrower outDir, or set outDir to a generated directory.',
      ].join('\n'),
    )
  }

  const managedDirAbs = path.resolve(normalized.srcDirAbs, firstSegment)

  if (!isInside(managedDirAbs, normalized.srcDirAbs)) {
    throw new Error(`externalMarkdown copyAssets managed directory must stay inside srcDir: ${relativePath}`)
  }

  return managedDirAbs
}

function collectManagedDirectories(
  normalized: NormalizedOptions,
  assets: MaterializedExternalAssetItem[],
): ManagedDirectory[] {
  const managedDirectories: ManagedDirectory[] = [
    ...collectMarkdownManagedDirectories(normalized),
    ...normalized.copyAssets
      .filter((asset) => asset.outDirAbs !== normalized.srcDirAbs)
      .map((asset) => ({
        dirAbs: asset.outDirAbs,
        clean: asset.clean,
        label: 'external asset outDir',
      })),
    ...assets.map((asset) => ({
      dirAbs: asset.managedDirAbs,
      clean: asset.clean,
      label: 'external asset outDir',
    })),
  ]
  const byDirectory = new Map<string, ManagedDirectory>()

  for (const managedDirectory of managedDirectories) {
    const current = byDirectory.get(managedDirectory.dirAbs)

    byDirectory.set(managedDirectory.dirAbs, {
      dirAbs: managedDirectory.dirAbs,
      clean: (current?.clean ?? false) || managedDirectory.clean,
      label: current?.label ?? managedDirectory.label,
    })
  }

  return [...byDirectory.values()].sort((a, b) => compareStrings(a.dirAbs, b.dirAbs))
}

function collectMarkdownManagedDirectories(normalized: NormalizedOptions): ManagedDirectory[] {
  if (normalized.sources.length === 0) {
    return []
  }

  return [
    {
      dirAbs: normalized.outDirAbs,
      clean: normalized.clean,
      label: 'external Markdown outDir',
    },
  ]
}

function prepareManagedDirectory(normalized: NormalizedOptions, managedDirectory: ManagedDirectory): void {
  const markerPath = path.join(managedDirectory.dirAbs, MARKER_FILE_NAME)

  if (existsSync(managedDirectory.dirAbs)) {
    const stat = statSync(managedDirectory.dirAbs)

    if (!stat.isDirectory()) {
      throw new Error(
        `externalMarkdown ${managedDirectory.label} exists but is not a directory: ${displayPath(
          normalized.root,
          managedDirectory.dirAbs,
        )}`,
      )
    }

    const entries = readdirSync(managedDirectory.dirAbs)
    const hasMarker = existsSync(markerPath)

    if (!hasMarker && entries.length > 0) {
      throw new Error(
        [
          `Refusing to use unmanaged ${managedDirectory.label}.`,
          `Directory: ${displayPath(normalized.root, managedDirectory.dirAbs)}`,
          `Expected marker file: ${MARKER_FILE_NAME}`,
        ].join('\n'),
      )
    }

    if (managedDirectory.clean) {
      if (!hasMarker && entries.length > 0) {
        throw new Error(`Refusing to clean unmanaged outDir: ${displayPath(normalized.root, managedDirectory.dirAbs)}`)
      }

      rmSync(managedDirectory.dirAbs, { recursive: true, force: true })
    }
  }

  mkdirSync(managedDirectory.dirAbs, { recursive: true })
  writeFileSync(markerPath, `${PLUGIN_NAME}\n`)
}

function compareAssets(a: MaterializedExternalAssetItem, b: MaterializedExternalAssetItem): number {
  return compareStrings(a.outputPath, b.outputPath)
}
