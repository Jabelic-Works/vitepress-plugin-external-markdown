# はじめに

このページでは、もっとも一般的な構成を例にします。VitePress site は
`docs/` にあり、package の Markdown は `packages/` にある monorepo です。

## repository 構成例

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

plugin は `packages/` 配下の Markdown を読み取り、`docs/src/generated/packages/`
配下に VitePress page として生成します。

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

生成 directory は `.gitignore` に追加してください。

```txt
docs/src/generated/
```

## VitePress config

`externalMarkdownOptions` を 1 つだけ定義し、Vite plugin と sidebar helper の
両方で使います。これにより、生成される Markdown と navigation metadata が同じ
resolver から作られます。

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

## 生成される route

上の構成では、以下のような route になります。

| Source file                  | Generated file                                  | Route                                |
| ---------------------------- | ----------------------------------------------- | ------------------------------------ |
| `packages/core/README.md`    | `docs/src/generated/packages/core.md`           | `/generated/packages/core`           |
| `packages/core/CHANGELOG.md` | `docs/src/generated/packages/core/changelog.md` | `/generated/packages/core/changelog` |
| `packages/editor/README.md`  | `docs/src/generated/packages/editor.md`         | `/generated/packages/editor`         |

## `root` を指定する理由

config が `docs/.vitepress/config.ts` にある場合、次の式は VitePress project
root である `docs/` を指します。

```ts
root: new URL('..', import.meta.url).pathname
```

これにより、`vitepress dev docs` のように monorepo root から command を実行しても、
helper が同じ root を使って deterministic に metadata を生成できます。

## deploy

この repository には、CI と GitHub Pages deploy 用の GitHub Actions workflow が含まれています。

- Pull request では format、lint、typecheck、test、package build、docs build、package dry-run を実行します。
- `main` への push でも同じ CI check を実行します。
- `main` への push では、VitePress docs を build して `docs/.vitepress/dist` を GitHub Pages に deploy します。

deploy 先は以下です。

```txt
https://jabelic-works.github.io/vitepress-plugin-external-markdown/
```

## npm publish

package release は GitHub Release から npm Trusted Publishing を使って publish します。
これにより、長期 `NPM_TOKEN` を GitHub Secrets に保存せずに済みます。

npmjs.com の package settings で、Trusted Publisher を以下の内容で設定してください。

| Field                | Value                                |
| -------------------- | ------------------------------------ |
| Publisher            | GitHub Actions                       |
| Organization or user | `Jabelic-Works`                      |
| Repository           | `vitepress-plugin-external-markdown` |
| Workflow filename    | `publish.yml`                        |
| Allowed action       | `npm publish`                        |
| Environment name     | 空欄                                 |

workflow は GitHub-hosted `ubuntu-latest` と Node.js 24、`id-token: write`
で実行し、npm が OIDC で認証できるようにします。

publish 手順は以下です。

1. `package.json` の version を更新する。
2. release commit を `main` に merge する。
3. package version と一致する tag、たとえば `v0.1.0` で GitHub Release を publish する。

publish workflow は `npm publish` の前に、release tag が `package.json` と一致すること、
同じ npm version がまだ publish されていないことを確認します。release job を手動で再実行する場合は、
`main` ではなく同じ version tag を指定して workflow dispatch してください。
