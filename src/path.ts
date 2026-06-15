import path from 'node:path'

export function normalizeRouteBase(routeBase: string): string {
  const withLeadingSlash = routeBase.startsWith('/') ? routeBase : `/${routeBase}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}

export function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '')
}

export function displayPath(root: string, filePath: string): string {
  const relative = toPosix(path.relative(root, filePath))
  return relative.startsWith('.') ? relative : relative || '.'
}

export function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1
  }

  if (a > b) {
    return 1
  }

  return 0
}

export function compareOrderValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return compareStrings(String(a), String(b))
}
