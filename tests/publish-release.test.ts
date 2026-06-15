import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const publishScriptPath = fileURLToPath(new URL('../scripts/publish-release.mjs', import.meta.url))

const createFakeNpm = (binDir: string) => {
  const fakeNpmPath = path.join(binDir, 'npm')
  writeFileSync(
    fakeNpmPath,
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)
const command = args.join(' ')

appendFileSync(process.env.NPM_CALL_LOG, \`\${command}\\n\`)

if (command === 'view fixture-package version') {
  if (process.env.PACKAGE_EXISTS === 'true') {
    console.log('0.1.0')
    process.exit(0)
  }

  console.error('npm error code E404')
  process.exit(1)
}

process.exit(0)
`,
  )
  chmodSync(fakeNpmPath, 0o755)
}

const runPublishScript = (packageExists: boolean) => {
  const root = mkdtempSync(path.join(tmpdir(), 'publish-release-'))
  const binDir = path.join(root, 'bin')
  const logPath = path.join(root, 'npm-calls.log')
  mkdirSync(binDir)
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture-package' }))
  writeFileSync(logPath, '')
  createFakeNpm(binDir)

  const result = spawnSync(process.execPath, [publishScriptPath], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      NPM_CALL_LOG: logPath,
      PACKAGE_EXISTS: packageExists ? 'true' : 'false',
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
    },
  })

  return {
    calls: readFileSync(logPath, 'utf8').trim().split('\n'),
    result,
  }
}

describe('publish-release script', () => {
  it('runs npm publish for the initial package release', () => {
    const { calls, result } = runPublishScript(false)

    expect(result.status).toBe(0)
    expect(calls).toEqual(['view fixture-package version', 'publish'])
  })

  it('runs npm stage publish when the package already exists', () => {
    const { calls, result } = runPublishScript(true)

    expect(result.status).toBe(0)
    expect(calls).toEqual(['view fixture-package version', 'stage publish'])
  })
})
