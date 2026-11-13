// Run after installing each math-tutor exercise's dependencies:
// node 06-structured_outputs/check-math-answer-boundary.cjs
// Test the actual pure boundary in both hooks without loading React or actions.
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')

let previousBoundary
for (const exercise of [
  'structured-outputs-math-tutor-final',
  'structured-outputs-math-tutor-starting-point'
]) {
  const directory = path.join(__dirname, exercise)
  const requireExercise = createRequire(path.join(directory, 'package.json'))
  const ts = requireExercise('typescript')
  const math = requireExercise('mathjs')
  const filename = path.join(directory, 'lib/useSolution.ts')
  const source = ts.createSourceFile(
    filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true
  )
  const declarations = source.statements.filter(statement =>
    (ts.isFunctionDeclaration(statement) && statement.name?.text === 'normalizeAnswer') ||
    (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(
      declaration => ['answerFunctions', 'answerOperators'].includes(declaration.name.getText(source))
    ))
  )
  assert.equal(declarations.length, 3, `${exercise}: missing boundary declarations`)
  const boundary = declarations.map(statement => statement.getText(source)).join('\n')
  if (previousBoundary !== undefined) {
    assert.equal(boundary, previousBoundary, 'The two exercise boundaries have drifted')
  }
  previousBoundary = boundary
  const compiled = ts.transpileModule(boundary, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 }
  }).outputText
  const normalize = vm.runInNewContext(`${compiled}\nnormalizeAnswer`, { ...math }, {
    filename, timeout: 1000
  })

  for (const [answer, expected] of [
    ['sqrt(9)', 3], ['x = 1/2', 0.5], ['1 / 2', 0.5],
    ['(2 + 3) * 4', 20], ['sin(pi / 2)', 1], ['-2^2', -4]
  ]) {
    assert.equal(normalize(answer), expected, `${exercise}: ${answer}`)
  }
  assert.equal(math.equal(normalize('sqrt(9)'), normalize('3')), true)
  assert.equal(math.equal(normalize('x = 1/2'), normalize('0.5')), true)
  for (const answer of [
    'random()', 'sqrt.constructor', 'sqrt["constructor"]', '[1, 2][1]',
    'a = 2', 'a = 2; a + 1', 'f(x) = x + 1', '2:5', '2 < 3',
    'import("anything")', '  UnknownName  ', 'not valid arithmetic('
  ]) {
    // A simple single-letter equation is deliberately accepted; assignments
    // to named state, blocks, function definitions and accessors are not.
    if (answer === 'a = 2') {
      assert.equal(normalize(answer), 2)
    } else {
      assert.equal(normalize(answer), answer.trim().toLowerCase(), `${exercise}: ${answer}`)
    }
  }
  console.log(`${exercise}: answer boundary checks passed`)
}
