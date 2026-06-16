# Releasing

Package releases are published to npm from GitHub Releases using npm Trusted
Publishing. The workflow uses Node.js 24 and GitHub OIDC, so it does not require
an `NPM_TOKEN`.

## Publish Steps

1. Update `package.json` version.
2. Merge the release commit to `main`.
3. Create and publish a GitHub Release with a tag matching the package version, for example `v0.1.0`.

The publish workflow checks that the release tag matches `package.json` and
that the exact npm version has not already been published before publishing or
staging the package.

For staged releases, review and approve the staged package with 2FA.

```sh
npm stage list vitepress-plugin-external-markdown
npm stage view <stage-id>
npm stage download <stage-id>
npm stage approve <stage-id>
```

If a release job needs to be retried manually, run the workflow dispatch against
the same version tag, not against `main`.
