import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { DEFAULT_SRC_DIR } from './constants.js'
import { displayPath, isInside, normalizeRouteBase } from './path.js'
import type { ExternalAssetCopy, ExternalMarkdownSource, ExternalMarkdownOptions, NormalizedOptions } from './types.js'

export function normalizeOptions(options: ExternalMarkdownOptions, root: string): NormalizedOptions {
  if (options.sources.length === 0 && !options.copyAssets?.length) {
    throw new Error('externalMarkdown requires at least one source or copyAssets entry.')
  }

  const rootAbs = path.resolve(root)
  const srcDir = options.srcDir ?? DEFAULT_SRC_DIR

  if (!srcDir.trim()) {
    throw new Error('externalMarkdown srcDir must not be empty.')
  }

  if (path.isAbsolute(srcDir)) {
    throw new Error('externalMarkdown srcDir must be relative to the VitePress project root.')
  }

  if (!options.outDir.trim()) {
    throw new Error('externalMarkdown outDir must not be empty.')
  }

  if (path.isAbsolute(options.outDir)) {
    throw new Error('externalMarkdown outDir must be relative to srcDir.')
  }

  const srcDirAbs = path.resolve(rootAbs, srcDir)
  const outDirAbs = path.resolve(srcDirAbs, options.outDir)

  if (outDirAbs === srcDirAbs) {
    throw new Error('externalMarkdown outDir must not resolve to srcDir itself.')
  }

  if (outDirAbs === rootAbs) {
    throw new Error('externalMarkdown outDir must not resolve to the VitePress project root.')
  }

  if (!isInside(outDirAbs, srcDirAbs)) {
    throw new Error('externalMarkdown outDir must resolve inside srcDir.')
  }

  const sources = options.sources.map((source) => ({
    source,
    baseDirAbs: normalizeBaseDir(rootAbs, source, 'source'),
  }))

  const copyAssets = (options.copyAssets ?? []).map((asset) => {
    if (!asset.outDir.trim()) {
      throw new Error('externalMarkdown copyAssets.outDir must not be empty.')
    }

    if (path.isAbsolute(asset.outDir)) {
      throw new Error('externalMarkdown copyAssets.outDir must be relative to srcDir.')
    }

    const assetOutDirAbs = path.resolve(srcDirAbs, asset.outDir)

    if (!isInside(assetOutDirAbs, srcDirAbs) && assetOutDirAbs !== srcDirAbs) {
      throw new Error('externalMarkdown copyAssets.outDir must resolve inside srcDir.')
    }

    return {
      asset,
      baseDirAbs: normalizeBaseDir(rootAbs, asset, 'copyAssets'),
      outDirAbs: assetOutDirAbs,
      clean: asset.clean ?? true,
    }
  })

  const normalized: NormalizedOptions = {
    root: rootAbs,
    srcDir,
    srcDirAbs,
    outDir: options.outDir,
    outDirAbs,
    routeBase: normalizeRouteBase(options.routeBase),
    clean: options.clean ?? true,
    sources,
    copyAssets,
  }

  if (options.resolveMarkdown) {
    normalized.resolveMarkdown = options.resolveMarkdown
  }

  return normalized
}

export function resolveRoot(options: ExternalMarkdownOptions, fallbackRoot: string): string {
  return path.resolve(options.root ?? fallbackRoot)
}

function normalizeBaseDir(
  rootAbs: string,
  source: Pick<ExternalMarkdownSource | ExternalAssetCopy, 'baseDir'>,
  label: 'source' | 'copyAssets',
): string {
  if (!source.baseDir.trim()) {
    throw new Error(`externalMarkdown ${label}.baseDir must not be empty.`)
  }

  if (path.isAbsolute(source.baseDir)) {
    throw new Error(`externalMarkdown ${label}.baseDir must be relative to the VitePress project root.`)
  }

  const baseDirAbs = path.resolve(rootAbs, source.baseDir)

  if (!existsSync(baseDirAbs)) {
    throw new Error(`External Markdown ${label} baseDir does not exist: ${displayPath(rootAbs, baseDirAbs)}`)
  }

  if (!statSync(baseDirAbs).isDirectory()) {
    throw new Error(`External Markdown ${label} baseDir is not a directory: ${displayPath(rootAbs, baseDirAbs)}`)
  }

  return baseDirAbs
}
