# Examples

## Import package README files only

This setup turns each `packages/*/README.md` into one generated VitePress page.

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

## Include README, CHANGELOG, and docs

This setup imports `README.md`, `CHANGELOG.md`, and files under package `docs/`
directories.

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

## Add top-level nav items

Return `nav: true` for files that should also appear in top-level navigation,
then use `getExternalMarkdownNav()`.

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

## Skip private or draft docs

Return `false` from the resolver to skip a source file.

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

## Inject generated frontmatter

Resolver frontmatter wins over source frontmatter when both define the same
field.

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

Generated Markdown receives one frontmatter block at the top of the file.
