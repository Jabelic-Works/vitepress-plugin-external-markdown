import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const expectedTag = `v${packageJson.version}`
const actualRef = process.env.GITHUB_REF_NAME

if (!actualRef) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.error('GITHUB_REF_NAME is not set.')
    process.exitCode = 1
  } else {
    console.warn('GITHUB_REF_NAME is not set; skipping release tag check.')
  }
} else if (actualRef !== expectedTag) {
  console.error(`Release tag must match package.json version. Expected ${expectedTag}, got ${actualRef}.`)
  process.exitCode = 1
}
