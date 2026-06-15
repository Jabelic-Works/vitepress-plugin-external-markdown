import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, vi } from 'vitest'
import type { ExternalMarkdownOptions } from '../src/index.js'
import { externalMarkdown } from '../src/index.js'
import type { Logger } from '../src/types.js'

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

export function createFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'external-markdown-'))
  tempRoots.push(root)
  return root
}

export function write(root: string, filePath: string, content: string): string {
  const absolutePath = path.join(root, filePath)
  rmSync(absolutePath, { force: true })
  mkdirSync(path.dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, content)
  return absolutePath
}

export function mkdirp(root: string, dirPath: string): string {
  const absolutePath = path.join(root, dirPath)
  mkdirSync(absolutePath, { recursive: true })
  return absolutePath
}

export function createLogger(): Logger {
  return {
    warn: vi.fn<(message: string) => void>(),
  }
}

export function runConfigResolved(options: ExternalMarkdownOptions, root: string): void {
  const plugin = externalMarkdown(options)
  const configResolved = Array.isArray(plugin) ? undefined : plugin.configResolved

  if (!configResolved) {
    throw new Error('Expected externalMarkdown to return a configResolved hook.')
  }

  const handler = typeof configResolved === 'function' ? configResolved : configResolved.handler

  handler.call(
    {} as never,
    {
      root,
      logger: {
        warn: vi.fn<(message: string) => void>(),
        error: vi.fn<(message: string) => void>(),
      },
    } as never,
  )
}
