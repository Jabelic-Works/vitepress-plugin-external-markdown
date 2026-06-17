import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createFixture, mkdirp, write } from './helpers.js'

const vitepressBinPath = fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url))
const nodeModulesPath = fileURLToPath(new URL('../node_modules', import.meta.url))
const pluginEntrySpecifier = fileURLToPath(new URL('../src/index.ts', import.meta.url))
const requireFromVitePress = createRequire(
  path.join(realpathSync(fileURLToPath(new URL('../node_modules/vitepress', import.meta.url))), 'package.json'),
)
const vueEntryPath = requireFromVitePress.resolve('vue/dist/vue.runtime.esm-bundler.js')
const vueServerRendererPath = requireFromVitePress.resolve('vue/server-renderer')

describe('VitePress build integration', () => {
  it('builds pages materialized from Markdown outside the VitePress project', () => {
    const root = createFixture()
    const docsRoot = path.join(root, 'docs')
    const generatedMarkdownPath = path.join(docsRoot, 'src/generated/packages/core.md')
    const generatedAssetPath = path.join(docsRoot, 'src/generated/packages/assets/core.svg')
    const outputHtmlPath = path.join(docsRoot, '.vitepress/dist/generated/packages/core.html')

    mkdirp(root, 'docs/src')
    symlinkSync(nodeModulesPath, path.join(root, 'node_modules'), 'dir')
    write(
      root,
      'external/packages/core/README.md',
      '# Core Package\n\nExternal body.\n\n![Core diagram](./assets/core.svg)\n',
    )
    write(
      root,
      'external/packages/core/assets/core.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><title>Core diagram</title><rect width="120" height="60" fill="#dcfce7"/></svg>\n',
    )
    write(root, 'docs/src/index.md', '# Home\n')
    write(
      root,
      'docs/.vitepress/config.ts',
      `import { externalMarkdown, getExternalMarkdownSidebar } from '${pluginEntrySpecifier}'

const externalMarkdownOptions = {
  root: ${JSON.stringify(docsRoot)},
  srcDir: 'src',
  sources: [
    {
      name: 'packages',
      baseDir: '../external/packages',
      pattern: '**/*.md',
    },
  ],
  outDir: 'generated/packages',
  routeBase: '/generated/packages/',
  copyAssets: [
    {
      baseDir: '../external/packages/core',
      pattern: 'assets/**/*',
      outDir: 'generated/packages',
    },
  ],
  resolveMarkdown(ctx) {
    const slug = ctx.relativePath
      .replace(/\\/README\\.md$/u, '')
      .replace(/\\.md$/u, '')
      .toLowerCase()

    return {
      slug,
      title: ctx.title,
      text: ctx.title,
      order: ctx.relativePath,
      sidebar: true,
    }
  },
}

export default {
  srcDir: 'src',
  outDir: '.vitepress/dist',
  vite: {
    resolve: {
      alias: [
        { find: 'vue/server-renderer', replacement: ${JSON.stringify(vueServerRendererPath)} },
        { find: 'vue', replacement: ${JSON.stringify(vueEntryPath)} },
      ],
    },
    plugins: [externalMarkdown(externalMarkdownOptions)],
  },
  themeConfig: {
    sidebar: {
      '/generated/packages/': getExternalMarkdownSidebar(externalMarkdownOptions),
    },
  },
}
`,
    )

    expect(existsSync(generatedMarkdownPath)).toBe(false)

    const result = spawnSync(process.execPath, [vitepressBinPath, 'build', docsRoot], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'true',
      },
    })

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(existsSync(generatedMarkdownPath)).toBe(true)
    expect(existsSync(generatedAssetPath)).toBe(true)
    expect(existsSync(outputHtmlPath)).toBe(true)

    const html = readFileSync(outputHtmlPath, 'utf8')
    expect(html).toContain('Core Package')
    expect(html).toContain('External body.')
    expect(html).toContain('Core diagram')
  }, 20_000)
})
