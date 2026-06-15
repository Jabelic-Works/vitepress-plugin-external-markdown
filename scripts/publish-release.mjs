import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const packageName = packageJson.name

if (typeof packageName !== 'string' || packageName.length === 0) {
  console.error('package.json must have a package name.')
  process.exit(1)
}

const packageView = spawnSync('npm', ['view', packageName, 'version'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const npmViewOutput = `${packageView.stdout}\n${packageView.stderr}`
const packageExists = packageView.status === 0
const packageMissing = npmViewOutput.includes('E404')

if (!packageExists && !packageMissing) {
  console.error(npmViewOutput.trim() || `Failed to check npm package existence for ${packageName}.`)
  process.exit(packageView.status ?? 1)
}

const publishArgs = packageExists ? ['stage', 'publish'] : ['publish']
const publishCommand = ['npm', ...publishArgs].join(' ')

if (packageExists) {
  console.log(`${packageName} exists on npm; running ${publishCommand}.`)
} else {
  console.log(`${packageName} is not on npm yet; running initial ${publishCommand}.`)
}

const publishResult = spawnSync('npm', publishArgs, {
  stdio: 'inherit',
})

if (publishResult.error) {
  console.error(publishResult.error.message)
  process.exit(1)
}

process.exit(publishResult.status ?? 1)
