import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const packageSpec = `${packageJson.name}@${packageJson.version}`

const result = spawnSync('npm', ['view', packageSpec, 'version'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (result.status === 0) {
  console.error(`${packageSpec} is already published.`)
  process.exitCode = 1
} else if (!result.stderr.includes('E404')) {
  console.error(result.stderr.trim() || `Failed to check npm version for ${packageSpec}.`)
  process.exitCode = result.status ?? 1
}
