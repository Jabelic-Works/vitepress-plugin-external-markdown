# Getting started

This guide shows the most common setup: a monorepo with a VitePress site in
`docs/` and package Markdown files in `packages/`.

## Example repository layout

```txt
repo/
  docs/
    .vitepress/
      config.ts
    src/
      index.md
  packages/
    core/
      README.md
      CHANGELOG.md
    editor/
      README.md
```

The plugin reads Markdown under `packages/` and writes generated pages under
`docs/src/generated/packages/`.

```txt
repo/
  docs/
    src/
      generated/
        packages/
          core.md
          core/changelog.md
          editor.md
```

Add the generated directory to `.gitignore`.

```txt
docs/src/generated/
```

Generated Markdown is a build artifact. Your deploy pipeline should run
`vitepress build` with this plugin enabled so generated pages are recreated
before the site is built.

## VitePress config

Use one shared `externalMarkdownOptions` object for both the Vite plugin and
the sidebar helper. This keeps generated files and navigation metadata in sync.

```ts
import { defineConfig } from 'vitepress'
import { externalMarkdown, getExternalMarkdownSidebar } from 'vitepress-plugin-external-markdown'

const externalMarkdownOptions = {
  root: new URL('..', import.meta.url).pathname,
  srcDir: 'src',
  sources: [
    {
      name: 'packages',
      baseDir: '../packages',
      pattern: '**/*.md',
    },
  ],
  outDir: 'generated/packages',
  routeBase: '/generated/packages/',
  resolveMarkdown(ctx) {
    const slug = ctx.relativePath
      .replace(/\/README\.md$/u, '')
      .replace(/\/index\.md$/u, '')
      .replace(/\.md$/u, '')
      .toLowerCase()

    return {
      slug,
      title: ctx.title,
      text: ctx.title,
      order: ctx.relativePath,
      sidebar: true,
      frontmatter: {
        editLink: false,
      },
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
      '/generated/packages/': [
        {
          text: 'Packages',
          items: getExternalMarkdownSidebar(externalMarkdownOptions),
        },
      ],
    },
  },
})
```

## Route result

With the layout above, generated routes look like this.

| Source file                  | Generated file                                  | Route                                |
| ---------------------------- | ----------------------------------------------- | ------------------------------------ |
| `packages/core/README.md`    | `docs/src/generated/packages/core.md`           | `/generated/packages/core`           |
| `packages/core/CHANGELOG.md` | `docs/src/generated/packages/core/changelog.md` | `/generated/packages/core/changelog` |
| `packages/editor/README.md`  | `docs/src/generated/packages/editor.md`         | `/generated/packages/editor`         |

## Why `root` is set

When the config lives at `docs/.vitepress/config.ts`, this expression points to
the VitePress project root, `docs/`.

```ts
root: new URL('..', import.meta.url).pathname
```

This makes helper calls deterministic even when commands are run from the
monorepo root, for example `vitepress dev docs`.
