import process from 'node:process'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { collectExternalMarkdown, toPublicItem } from './collect.js'
import { PLUGIN_NAME } from './constants.js'
import { defaultLogger, toLogger } from './logger.js'
import { materializeExternalMarkdown } from './materialize.js'
import { normalizeOptions, resolveRoot } from './normalize.js'
import { watchSources } from './watch.js'
import type {
  ExternalMarkdownItem,
  ExternalMarkdownNavItem,
  ExternalMarkdownOptions,
  ExternalMarkdownSidebarItem,
} from './types.js'

export type {
  ExternalMarkdownContext,
  ExternalMarkdownItem,
  ExternalMarkdownNavItem,
  ExternalMarkdownOptions,
  ExternalMarkdownSidebarItem,
  ExternalMarkdownSource,
  ResolvedExternalMarkdown,
} from './types.js'

export function externalMarkdown(options: ExternalMarkdownOptions): Plugin {
  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      const root = resolveRoot(options, config.root)
      materializeExternalMarkdown(options, {
        root,
        logger: toLogger(config),
      })
    },
    configureServer(server: ViteDevServer) {
      const resolvedRoot = resolveRoot(options, server.config.root)
      watchSources(server, options, resolvedRoot)
    },
  }
}

export function getExternalMarkdownItems(options: ExternalMarkdownOptions): ExternalMarkdownItem[] {
  const normalized = normalizeOptions(options, resolveRoot(options, process.cwd()))
  return collectExternalMarkdown(normalized, defaultLogger()).map((item) => toPublicItem(item))
}

export function getExternalMarkdownSidebar(options: ExternalMarkdownOptions): ExternalMarkdownSidebarItem[] {
  return getExternalMarkdownItems(options)
    .filter((item) => item.sidebar)
    .map((item) => ({
      text: item.text,
      link: item.link,
    }))
}

export function getExternalMarkdownNav(options: ExternalMarkdownOptions): ExternalMarkdownNavItem[] {
  return getExternalMarkdownItems(options)
    .filter((item) => item.nav)
    .map((item) => ({
      text: item.text,
      link: item.link,
    }))
}
