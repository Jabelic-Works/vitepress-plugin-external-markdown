# 例

各例は `src/generated/...` 配下に Markdown を生成します。生成された Markdown は
commit せず、生成 directory を `.gitignore` に追加してください。
deploy 時は `vitepress build` を実行し、site build 前に plugin が生成物を再作成
できるようにしてください。

```txt
docs/src/generated/
```

## package README だけを取り込む

`packages/*/README.md` を、それぞれ 1 つの VitePress page として生成する例です。

```ts
import { defineConfig } from 'vitepress'
import { externalMarkdown, getExternalMarkdownSidebar } from 'vitepress-plugin-external-markdown'

const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  srcDir: 'src',
  sources: [
    {
      baseDir: '../packages',
      pattern: '*/README.md',
    },
  ],
  outDir: 'generated/packages',
  routeBase: '/generated/packages/',
  resolveMarkdown(ctx) {
    const packageName = ctx.relativePath.replace(/\/README\.md$/u, '')

    return {
      slug: packageName,
      title: ctx.title,
      text: packageName,
      order: packageName,
      sidebar: true,
    }
  },
}

export default defineConfig({
  srcDir: 'src',
  vite: {
    plugins: [externalMarkdown(externalMarkdownOptions)],
  },
  themeConfig: {
    sidebar: {
      '/generated/packages/': getExternalMarkdownSidebar(externalMarkdownOptions),
    },
  },
})
```

## README、CHANGELOG、docs を取り込む

`README.md`、`CHANGELOG.md`、package 内の `docs/**/*.md` を取り込む例です。

```ts
const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  srcDir: 'src',
  sources: [
    {
      name: 'package-docs',
      baseDir: '../packages',
      pattern: '{*/README.md,*/CHANGELOG.md,*/docs/**/*.md}',
    },
  ],
  outDir: 'generated/packages',
  routeBase: '/generated/packages/',
  resolveMarkdown(ctx) {
    const slug = ctx.relativePath
      .replace(/\/README\.md$/u, '')
      .replace(/\.md$/u, '')
      .toLowerCase()

    return {
      slug,
      title: ctx.title,
      text: ctx.fileName === 'README.md' ? ctx.relativePath.split('/')[0] : ctx.title,
      order: ctx.relativePath,
      sidebar: true,
    }
  },
}
```

## 同梱 asset を copy する

取り込む Markdown が近くの画像や static file を参照している場合は
`copyAssets` を使います。asset copy は Markdown 生成とは独立して実行され、
Markdown 内の link は書き換えません。

```ts
const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  srcDir: 'src',
  sources: [
    {
      baseDir: '../docs-content',
      pattern: '**/*.md',
    },
  ],
  outDir: 'generated/docs',
  routeBase: '/generated/docs/',
  copyAssets: [
    {
      baseDir: '../docs-content',
      pattern: 'images/**/*',
      outDir: 'generated/docs',
    },
    {
      baseDir: '../docs-content',
      pattern: 'public/**/*',
      outDir: '.',
    },
  ],
}
```

この設定では、以下のように materialize されます。

```txt
docs/src/generated/docs/images/example.png
docs/src/public/logo.png
```

## top-level nav にも出す

top-level navigation に出したい file だけ `nav: true` を返し、
`getExternalMarkdownNav()` を使います。

```ts
import {
  externalMarkdown,
  getExternalMarkdownNav,
  getExternalMarkdownSidebar,
} from 'vitepress-plugin-external-markdown'

const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  srcDir: 'src',
  sources: [
    {
      baseDir: '../packages',
      pattern: '*/README.md',
    },
  ],
  outDir: 'generated/packages',
  routeBase: '/generated/packages/',
  resolveMarkdown(ctx) {
    const packageName = ctx.relativePath.replace(/\/README\.md$/u, '')

    return {
      slug: packageName,
      title: ctx.title,
      text: ctx.title,
      order: packageName,
      sidebar: true,
      nav: packageName === 'core',
    }
  },
}

export default defineConfig({
  srcDir: 'src',
  vite: {
    plugins: [externalMarkdown(externalMarkdownOptions)],
  },
  themeConfig: {
    nav: getExternalMarkdownNav(externalMarkdownOptions),
    sidebar: {
      '/generated/packages/': getExternalMarkdownSidebar(externalMarkdownOptions),
    },
  },
})
```

## private / draft docs を skip する

resolver から `false` を返すと、その source file は生成されません。

```ts
resolveMarkdown(ctx) {
  if (ctx.relativePath.includes('/drafts/')) {
    return false
  }

  return {
    slug: ctx.relativePath.replace(/\.md$/u, ''),
    title: ctx.title,
    text: ctx.title,
    order: ctx.relativePath,
  }
}
```

## generated frontmatter を注入する

source Markdown と resolver の両方に frontmatter がある場合、resolver 側が優先されます。

```ts
resolveMarkdown(ctx) {
  return {
    slug: ctx.relativePath.replace(/\.md$/u, ''),
    title: ctx.title,
    text: ctx.title,
    order: ctx.relativePath,
    frontmatter: {
      outline: 'deep',
      editLink: false,
    },
  }
}
```

生成された Markdown には、file 先頭に frontmatter block が 1 つだけ書き出されます。
