import { describe, it, expect } from 'vitest'
import { matchPath } from 'react-router-dom'

import {
  PATHS,
  ROUTES,
  JUDGE_LANGUAGES,
  judgeLanguage,
  codeModeOf,
  languageForFilename,
  isLanguageTemplate,
} from './constants'

describe('PATHS', () => {
  it.each([
    ['group', PATHS.group('g1'), '/groups/g1'],
    ['groupEdit', PATHS.groupEdit('g1'), '/groups/g1/edit'],
    ['groupAcceptInvitation', PATHS.groupAcceptInvitation('g1', 'i9'), '/groups/g1/invitations/i9/accept'],
    ['contest', PATHS.contest('g1', 'c2'), '/groups/g1/contests/c2'],
    ['contestNew', PATHS.contestNew('g1'), '/groups/g1/contests/new'],
    ['contestEdit', PATHS.contestEdit('g1', 'c2'), '/groups/g1/contests/c2/edit'],
    ['contestStandings', PATHS.contestStandings('g1', 'c2'), '/groups/g1/contests/c2/standings'],
    ['contestSubmissions', PATHS.contestSubmissions('g1', 'c2'), '/groups/g1/contests/c2/submissions'],
    ['contestParticipants', PATHS.contestParticipants('g1', 'c2'), '/groups/g1/contests/c2/participants'],
    ['contestProblem', PATHS.contestProblem('g1', 'c2', 'B'), '/groups/g1/contests/c2/problems/B'],
    ['contestSubmit sin problema', PATHS.contestSubmit('g1', 'c2'), '/groups/g1/contests/c2/submit'],
    ['contestSubmit con problema', PATHS.contestSubmit('g1', 'c2', 'two-sum'), '/groups/g1/contests/c2/submit?problem=two-sum'],
    ['problem', PATHS.problem('two-sum'), '/problems/two-sum'],
    ['problemEdit', PATHS.problemEdit('two-sum'), '/problems/two-sum/edit'],
    ['problemSubmissions', PATHS.problemSubmissions('two-sum'), '/problems/two-sum/submissions'],
    ['problemFiles', PATHS.problemFiles('two-sum'), '/problems/two-sum?tab=files'],
    ['problemTestCases', PATHS.problemTestCases('two-sum'), '/problems/two-sum/testcases'],
    ['problemJudgingFile', PATHS.problemJudgingFile('two-sum', 'checker'), '/problems/two-sum/files/checker'],
    ['submission', PATHS.submission('s7'), '/submissions/s7'],
    ['materials', PATHS.materials('g1'), '/groups/g1/materials'],
    ['materialNew', PATHS.materialNew('g1'), '/groups/g1/materials/new'],
    ['material', PATHS.material('g1', 'm3'), '/groups/g1/materials/m3'],
    ['materialEdit', PATHS.materialEdit('g1', 'm3'), '/groups/g1/materials/m3/edit'],
  ])('%s construye la URL esperada', (_name, actual, expected) => {
    expect(actual).toBe(expected)
  })

  it('codifica el nombre de archivo y de caso en las URLs de vistas completas', () => {
    expect(PATHS.problemSolutionFile('two-sum', 'mi sol#1.cpp')).toBe(
      '/problems/two-sum/files/solution/mi%20sol%231.cpp',
    )
    expect(PATHS.problemTestCase('two-sum', 'secret', 'caso 01')).toBe('/problems/two-sum/testcases/secret/caso%2001')
  })

  it.each([
    ['group', ROUTES.GROUP_DETAIL, PATHS.group('g1'), { id: 'g1' }],
    ['groupEdit', ROUTES.GROUP_EDIT, PATHS.groupEdit('g1'), { id: 'g1' }],
    [
      'groupAcceptInvitation',
      ROUTES.GROUP_ACCEPT_INVITATION,
      PATHS.groupAcceptInvitation('g1', 'i9'),
      { groupId: 'g1', invitationId: 'i9' },
    ],
    ['contest', ROUTES.CONTEST_DETAIL, PATHS.contest('g1', 'c2'), { groupId: 'g1', id: 'c2' }],
    ['contestEdit', ROUTES.CONTEST_EDIT, PATHS.contestEdit('g1', 'c2'), { groupId: 'g1', id: 'c2' }],
    ['contestStandings', ROUTES.CONTEST_STANDINGS, PATHS.contestStandings('g1', 'c2'), { groupId: 'g1', id: 'c2' }],
    ['contestSubmissions', ROUTES.CONTEST_SUBMISSIONS, PATHS.contestSubmissions('g1', 'c2'), { groupId: 'g1', id: 'c2' }],
    ['contestParticipants', ROUTES.CONTEST_PARTICIPANTS, PATHS.contestParticipants('g1', 'c2'), { groupId: 'g1', id: 'c2' }],
    [
      'contestProblem',
      ROUTES.CONTEST_PROBLEM,
      PATHS.contestProblem('g1', 'c2', 'B'),
      { groupId: 'g1', contestId: 'c2', letter: 'B' },
    ],
    ['problem', ROUTES.PROBLEM_DETAIL, PATHS.problem('two-sum'), { slug: 'two-sum' }],
    ['problemEdit', ROUTES.PROBLEM_EDIT, PATHS.problemEdit('two-sum'), { slug: 'two-sum' }],
    ['problemSubmissions', ROUTES.PROBLEM_SUBMISSIONS, PATHS.problemSubmissions('two-sum'), { slug: 'two-sum' }],
    ['problemTestCases', ROUTES.PROBLEM_TESTCASES, PATHS.problemTestCases('two-sum'), { slug: 'two-sum' }],
    [
      'problemSolutionFile',
      ROUTES.PROBLEM_SOLUTION_FILE,
      PATHS.problemSolutionFile('two-sum', 'a.cpp'),
      { slug: 'two-sum', fileName: 'a.cpp' },
    ],
    [
      'problemJudgingFile',
      ROUTES.PROBLEM_JUDGING_FILE,
      PATHS.problemJudgingFile('two-sum', 'validator'),
      { slug: 'two-sum', fileType: 'validator' },
    ],
    [
      'problemTestCase',
      ROUTES.PROBLEM_TESTCASE,
      PATHS.problemTestCase('two-sum', 'sample', '01'),
      { slug: 'two-sum', kind: 'sample', name: '01' },
    ],
    ['submission', ROUTES.SUBMISSION_DETAIL, PATHS.submission('s7'), { id: 's7' }],
    ['materials', ROUTES.MATERIALS, PATHS.materials('g1'), { groupId: 'g1' }],
    ['material', ROUTES.MATERIAL_DETAIL, PATHS.material('g1', 'm3'), { groupId: 'g1', materialId: 'm3' }],
    ['materialEdit', ROUTES.MATERIAL_EDIT, PATHS.materialEdit('g1', 'm3'), { groupId: 'g1', materialId: 'm3' }],
  ])('PATHS.%s genera una URL que el patrón de ruta correspondiente reconoce', (_name, pattern, url, params) => {
    const match = matchPath(pattern, url)

    expect(match?.params).toEqual(params)
  })
})

describe('judgeLanguage', () => {
  it.each([
    ['cpp20', 'g++'],
    ['java17', 'javac'],
    ['python310', 'py'],
  ])('devuelve la configuración de %s con el compilador %s', (language, compiler) => {
    expect(judgeLanguage(language)?.compiler).toBe(compiler)
  })

  it.each([['blockly'], ['ruby'], ['']])('devuelve undefined para el lenguaje no soportado %j', (language) => {
    expect(judgeLanguage(language)).toBeUndefined()
  })
})

describe('codeModeOf', () => {
  it.each([
    ['cpp20', 'cpp'],
    ['java17', 'java'],
    ['python310', 'python'],
    ['blockly', 'python'],
  ])('el modo de sintaxis de %s es %s', (language, mode) => {
    expect(codeModeOf(language)).toBe(mode)
  })

  it('devuelve undefined para un lenguaje desconocido', () => {
    expect(codeModeOf('ruby')).toBeUndefined()
  })
})

describe('languageForFilename', () => {
  it.each([
    ['sol.cpp', 'cpp20'],
    ['sol.cc', 'cpp20'],
    ['SOL.CPP', 'cpp20'],
    ['Main.java', 'java17'],
    ['sol.py', 'python310'],
    ['mi.solucion.final.py', 'python310'],
  ])('detecta el lenguaje de %s como %s', (filename, language) => {
    expect(languageForFilename(filename)).toBe(language)
  })

  it.each([['notas.txt'], ['sin_extension'], ['sol.rb']])('devuelve undefined para %s', (filename) => {
    expect(languageForFilename(filename)).toBeUndefined()
  })
})

describe('isLanguageTemplate', () => {
  it.each(Object.keys(JUDGE_LANGUAGES))('reconoce la plantilla inicial intacta de %s', (language) => {
    const template = JUDGE_LANGUAGES[language as keyof typeof JUDGE_LANGUAGES].template

    expect(isLanguageTemplate(template)).toBe(true)
  })

  it('no reconoce una plantilla modificada ni un editor vacío', () => {
    expect(isLanguageTemplate(JUDGE_LANGUAGES.python310.template + '# mi cambio')).toBe(false)
    expect(isLanguageTemplate('')).toBe(false)
  })
})
