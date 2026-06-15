import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vitepress-plugin-external-markdown',
  description: 'Materialize Markdown files outside a VitePress srcDir as generated pages.',
  base: '/vitepress-plugin-external-markdown/',
  cleanUrls: true,
  lastUpdated: true,
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
          { text: 'Guide', link: '/' },
          { text: 'Examples', link: '/examples' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting started', link: '/' },
              { text: 'Examples', link: '/examples' },
            ],
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
            items: [
              { text: 'はじめに', link: '/ja/' },
              { text: '例', link: '/ja/examples' },
            ],
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
