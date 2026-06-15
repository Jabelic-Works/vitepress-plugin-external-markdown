import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const sourceRoot = path.resolve('src')

const sourceFiles = listTypeScriptFiles(sourceRoot)
const violations = sourceFiles.flatMap((filePath) => findLetDeclarations(filePath))

if (violations.length > 0) {
  console.error('`let` declarations are not allowed in src. Prefer const-oriented control flow.')
  console.error(violations.map((violation) => `- ${violation}`).join('\n'))
  process.exitCode = 1
}

function listTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return listTypeScriptFiles(entryPath)
    }

    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      return [entryPath]
    }

    return []
  })
}

function findLetDeclarations(filePath) {
  const sourceText = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const fileViolations = []

  visit(sourceFile)

  return fileViolations

  function visit(node) {
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Let) !== 0) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      fileViolations.push(`${path.relative(process.cwd(), filePath)}:${position.line + 1}:${position.character + 1}`)
    }

    ts.forEachChild(node, visit)
  }
}
