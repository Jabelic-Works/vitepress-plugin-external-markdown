import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import type { ViteDevServer } from 'vite'
import { toLogger } from './logger.js'
import { materializeExternalMarkdown } from './materialize.js'
import { normalizeOptions } from './normalize.js'
import { isInside } from './path.js'
import type { ExternalMarkdownOptions, NormalizedOptions } from './types.js'

export function watchSources(server: ViteDevServer, options: ExternalMarkdownOptions, root: string): void {
  const normalized = normalizeOptions(options, root)
  const watchedDirs = [
    ...normalized.sources.map((source) => source.baseDirAbs),
    ...normalized.copyAssets.map((asset) => asset.baseDirAbs),
  ]

  server.watcher.add(watchedDirs)

  const debounce: { timer?: NodeJS.Timeout } = {}
  const regenerate = (filePath: string) => {
    const absoluteFilePath = path.resolve(filePath)

    if (isManagedOutputPath(absoluteFilePath, normalized)) {
      return
    }

    if (!isRelevantWatchPath(absoluteFilePath, normalized)) {
      return
    }

    if (debounce.timer) {
      clearTimeout(debounce.timer)
    }

    debounce.timer = setTimeout(() => {
      try {
        materializeExternalMarkdown(options, {
          root,
          logger: toLogger(server.config),
        })
        server.ws.send({ type: 'full-reload' })
      } catch (error) {
        server.config.logger.error(error instanceof Error ? error.message : String(error))
      }
    }, 50)
  }

  server.watcher.on('add', regenerate)
  server.watcher.on('change', regenerate)
  server.watcher.on('unlink', regenerate)
  server.watcher.on('addDir', regenerate)
  server.watcher.on('unlinkDir', regenerate)
}

function isRelevantWatchPath(filePath: string, normalized: NormalizedOptions): boolean {
  if (filePath.endsWith('.md')) {
    return normalized.sources.some((source) => isInside(filePath, source.baseDirAbs))
  }

  if (normalized.copyAssets.some((asset) => isInside(filePath, asset.baseDirAbs))) {
    return true
  }

  return normalized.sources.some((source) => {
    return isInside(filePath, source.baseDirAbs) && existsSync(filePath) && statSync(filePath).isDirectory()
  })
}

function isManagedOutputPath(filePath: string, normalized: NormalizedOptions): boolean {
  return (
    isInside(filePath, normalized.outDirAbs) ||
    normalized.copyAssets.some((asset) => {
      return isInside(filePath, asset.outDirAbs) || filePath === asset.outDirAbs
    })
  )
}
