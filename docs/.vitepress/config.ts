import { defineConfig } from 'vitepress'
import {
  externalMarkdown,
  getExternalMarkdownSidebar,
  type ExternalMarkdownContext,
  type ExternalMarkdownOptions,
  type ResolvedExternalMarkdown,
} from '../../src/index.js'

function resolveDocsMarkdown(routeBase: string) {
  return (ctx: ExternalMarkdownContext): ResolvedExternalMarkdown => {
    const slug = ctx.relativePath.replace(/\.md$/u, '')
    const isIndex = slug === 'index'

    return {
      slug,
      fileName: `${slug}.md`,
      link: isIndex ? routeBase : `${routeBase}${slug}`,
      title: ctx.title,
      text: ctx.title,
      order: isIndex ? 0 : ctx.relativePath,
      sidebar: true,
      frontmatter: {
        editLink: false,
      },
    }
  }
}

const englishDocsOptions: ExternalMarkdownOptions = {
  root: 'docs',
  srcDir: 'src',
  sources: [
    {
      name: 'english-docs',
      baseDir: '../docs-content/en',
      pattern: '*.md',
    },
  ],
  outDir: 'guide',
  routeBase: '/guide/',
  copyAssets: [
    {
      baseDir: '../docs-content/en',
      pattern: 'assets/**/*',
      outDir: 'guide',
    },
  ],
  resolveMarkdown: resolveDocsMarkdown('/guide/'),
}

const japaneseDocsOptions: ExternalMarkdownOptions = {
  root: 'docs',
  srcDir: 'src',
  sources: [
    {
      name: 'japanese-docs',
      baseDir: '../docs-content/ja',
      pattern: '*.md',
    },
  ],
  outDir: 'ja',
  routeBase: '/ja/',
  copyAssets: [
    {
      baseDir: '../docs-content/ja',
      pattern: 'assets/**/*',
      outDir: 'ja',
    },
  ],
  resolveMarkdown: resolveDocsMarkdown('/ja/'),
}

export default defineConfig({
  srcDir: 'src',
  title: 'vitepress-plugin-external-markdown',
  description: 'Materialize Markdown files outside a VitePress srcDir as generated pages.',
  base: '/vitepress-plugin-external-markdown/',
  cleanUrls: true,
  lastUpdated: true,
  vite: {
    plugins: [externalMarkdown(englishDocsOptions), externalMarkdown(japaneseDocsOptions)],
  },
  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Jabelic-Works/vitepress-plugin-external-markdown',
      },
    ],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Examples', link: '/guide/examples' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: getExternalMarkdownSidebar(englishDocsOptions),
          },
        ],
      },
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      description: 'VitePress の srcDir 外にある Markdown を generated page として取り込む plugin。',
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/' },
          { text: '例', link: '/ja/examples' },
        ],
        sidebar: [
          {
            text: 'ガイド',
            items: getExternalMarkdownSidebar(japaneseDocsOptions),
          },
        ],
        outline: {
          label: '目次',
        },
        docFooter: {
          prev: '前のページ',
          next: '次のページ',
        },
        darkModeSwitchLabel: '外観',
        sidebarMenuLabel: 'メニュー',
        returnToTopLabel: 'トップへ戻る',
        langMenuLabel: '言語を変更',
      },
    },
  },
})
