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
    expect(normalized.copyAssets).toEqual([])
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

  it('normalizes asset copy definitions relative to srcDir', () => {
    const root = createFixture()
    mkdirp(root, 'packages')

    const normalized = normalizeOptions(
      {
        sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../packages',
            pattern: ['images/**/*', 'public/**/*'],
            outDir: 'generated/assets',
            clean: false,
          },
        ],
      },
      path.join(root, 'docs'),
    )

    expect(normalized.copyAssets[0]?.baseDirAbs).toBe(path.join(root, 'packages'))
    expect(normalized.copyAssets[0]?.outDirAbs).toBe(path.join(root, 'docs/src/generated/assets'))
    expect(normalized.copyAssets[0]?.clean).toBe(false)
  })

  it('allows asset copy definitions without Markdown sources', () => {
    const root = createFixture()
    mkdirp(root, 'assets')

    const normalized = normalizeOptions(
      {
        sources: [],
        outDir: 'generated/external',
        routeBase: '/generated/external/',
        copyAssets: [
          {
            baseDir: '../assets',
            pattern: 'images/**/*',
            outDir: 'generated/assets',
          },
        ],
      },
      path.join(root, 'docs'),
    )

    expect(normalized.sources).toEqual([])
    expect(normalized.copyAssets[0]?.baseDirAbs).toBe(path.join(root, 'assets'))
  })

  it('rejects options without Markdown sources or asset copy definitions', () => {
    const root = createFixture()

    expect(() =>
      normalizeOptions(
        {
          sources: [],
          outDir: 'generated/external',
          routeBase: '/generated/external/',
        },
        path.join(root, 'docs'),
      ),
    ).toThrow(/requires at least one source or copyAssets entry/)
  })

  it('rejects asset outDir values that escape srcDir', () => {
    const root = createFixture()
    mkdirp(root, 'packages')

    expect(() =>
      normalizeOptions(
        {
          sources: [{ baseDir: '../packages', pattern: '**/*.md' }],
          outDir: 'generated/external',
          routeBase: '/generated/external/',
          copyAssets: [
            {
              baseDir: '../packages',
              pattern: 'images/**/*',
              outDir: '../assets',
            },
          ],
        },
        path.join(root, 'docs'),
      ),
    ).toThrow(/copyAssets.outDir must resolve inside srcDir/)
  })
})

describe('resolveRoot', () => {
  it('prefers the configured root over the fallback root', () => {
    expect(resolveRoot({ root: 'docs', sources: [], outDir: 'generated', routeBase: '/generated/' }, 'fallback')).toBe(
      path.resolve('docs'),
    )
  })
})
