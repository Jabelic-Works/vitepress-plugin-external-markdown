import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeOptions, resolveRoot } from '../src/normalize.js'
import { createFixture, mkdirp } from './helpers.js'

const resolveGuide = () => ({ slug: 'guide' })

describe('normalizeOptions', () => {
  it('resolves defaults and normalizes routeBase relative to the project root', () => {
    const root = createFixture()
    mkdirp(root, 'packages')

    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: 'generated/external',
      },
      path.join(root, 'docs'),
    )

    expect(normalized.root).toBe(path.join(root, 'docs'))
    expect(normalized.srcDir).toBe('src')
    expect(normalized.srcDirAbs).toBe(path.join(root, 'docs/src'))
    expect(normalized.outDirAbs).toBe(path.join(root, 'docs/src/generated/external'))
    expect(normalized.routeBase).toBe('/generated/external/')
    expect(normalized.clean).toBe(true)
    expect(normalized.sources[0]?.baseDirAbs).toBe(path.join(root, 'packages'))
  })

  it('preserves explicit clean false and resolveMarkdown', () => {
    const root = createFixture()
    mkdirp(root, 'packages')

    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        clean: false,
        resolveMarkdown: resolveGuide,
      },
      path.join(root, 'docs'),
    )

    expect(normalized.clean).toBe(false)
    expect(normalized.resolveMarkdown).toBe(resolveGuide)
  })

  it('rejects outDir values that escape srcDir or point at srcDir itself', () => {
    const root = createFixture()
    mkdirp(root, 'packages')
    const baseOptions = {
      sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
      routeBase: '/generated/external/',
    }

    expect(() =>
      normalizeOptions(
        {
          ...baseOptions,
          outDir: '../generated',
        },
        path.join(root, 'docs'),
      ),
    ).toThrow(/outDir must resolve inside srcDir/)

    expect(() =>
      normalizeOptions(
        {
          ...baseOptions,
          outDir: '.',
        },
        path.join(root, 'docs'),
      ),
    ).toThrow(/outDir must not resolve to srcDir itself/)
  })

  it('rejects missing source base directories', () => {
    const root = createFixture()

    expect(() =>
      normalizeOptions(
        {
          sources: [{ baseDir: '../missing', pattern: '**/*.md' }],
          outDir: 'generated/external',
          routeBase: '/generated/external/',
        },
        path.join(root, 'docs'),
      ),
    ).toThrow(/source baseDir does not exist/)
  })
})

describe('resolveRoot', () => {
  it('prefers the configured root over the fallback root', () => {
    expect(resolveRoot({ root: 'docs', sources: [], outDir: 'generated', routeBase: '/generated/' }, 'fallback')).toBe(
      path.resolve('docs'),
    )
  })
})
