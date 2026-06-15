# vitepress-plugin-external-markdown

Materialize Markdown files outside a VitePress `srcDir` as generated Markdown
pages inside `srcDir`.

This plugin copies external Markdown into a generated directory so VitePress can
route it as normal pages. The same resolver drives generated files, sidebar
items, nav items, and item metadata.

## Install

```sh
pnpm add -D vitepress-plugin-external-markdown
```

## Usage

```ts
import { defineConfig } from 'vitepress'
import { externalMarkdown, getExternalMarkdownSidebar } from 'vitepress-plugin-external-markdown'

const externalMarkdownOptions = {
  srcDir: 'src',
  sources: [
    {
      baseDir: '../packages',
      pattern: '**/*.md',
    },
  ],
  outDir: 'generated/external',
  routeBase: '/generated/external/',
  resolveMarkdown(ctx) {
    return {
      slug: ctx.relativePath.replace(/\/index\.md$/, '').replace(/\.md$/, ''),
      title: ctx.title,
      text: ctx.title,
      order: ctx.relativePath,
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
      '/generated/external/': [
        {
          text: 'External Markdown',
          items: getExternalMarkdownSidebar(externalMarkdownOptions),
        },
      ],
    },
  },
})
```

If the VitePress command is run from a directory other than the VitePress
project root, set `root` in the options used by the helpers:

```ts
const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  // ...
}
```

## Generated files

Generated files are written under `srcDir/outDir`, for example:

```txt
docs/
  src/
    generated/
      external/
        guide.md
```

Add the generated directory to `.gitignore`:

```gitignore
docs/src/generated/
```

The plugin writes a marker file named
`.vitepress-plugin-external-markdown`. Existing non-empty directories without
that marker are not cleaned.

## API

```ts
externalMarkdown(options)
getExternalMarkdownItems(options)
getExternalMarkdownSidebar(options)
getExternalMarkdownNav(options)
```

`resolveMarkdown(ctx)` may return `false` to skip a source file.

## MVP limitations

This package intentionally does not rewrite relative links, copy image assets,
create virtual routes, read remote Markdown, support MDX, or infer package docs
automatically.
