import type { ResolvedConfig } from 'vite'
import { PLUGIN_NAME } from './constants.js'
import type { Logger } from './types.js'

export function toLogger(config: Pick<ResolvedConfig, 'logger'>): Logger {
  return {
    warn: (message) => config.logger.warn(message),
  }
}

export function defaultLogger(): Logger {
  return {
    warn: (message) => console.warn(`[${PLUGIN_NAME}] ${message}`),
  }
}
