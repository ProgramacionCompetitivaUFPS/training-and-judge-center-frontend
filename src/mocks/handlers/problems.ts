import { http, HttpResponse, delay } from 'msw'
import { mockProblems, buildProblemList, mockProblemStatistics, mockUsers, mockCurrentUser, mockContests } from '../data'
import type { ProblemDetail } from '@/types/problem'
import { url } from './utils'
import { PROBLEM_FILE_TYPE_INFO, PROBLEM_SOURCE_FILE_EXTENSIONS, PROBLEM_LANGUAGE_BY_EXTENSION } from '@/lib/constants'

export const problemsHandlers = [
  // List problems
  http.get(url('/problems'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const result = buildProblemList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      status: sp.get('status') || undefined,
      accessibility: sp.get('accessibility') || undefined,
      tags: sp.get('tags') || undefined,
      author: sp.get('author') || undefined,
      search: sp.get('search') || undefined,
      userNickname,
    })
    return HttpResponse.json(result)
  }),

  // Problem detail
  http.get(url('/problems/p/:slug'), async ({ params, request }) => {
    await delay(200)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    if (problem.status === 'DRAFT') {
      const isAdmin = userNickname === 'luisadmin'
      const isModifier = problem.modifiers?.some((m) => m.nickname === userNickname)
      if (!isAdmin && !isModifier) {
        return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'No tienes permisos para ver este problema en borrador' }, { status: 403 })
      }
    }

    // Strip modifiers/files for non-modifiers
    const isAdmin = userNickname === 'luisadmin'
    const isModifier = problem.modifiers?.some((m) => m.nickname === userNickname)
    if (!isAdmin && !isModifier) {
      const { modifiers: _modifiers, files: _files, ...publicData } = problem
      return HttpResponse.json(publicData)
    }

    return HttpResponse.json(problem)
  }),

  // Create problem
  http.post(url('/problems'), async ({ request }) => {
    await delay(300)
    const auth = request.headers.get('Authorization')
    if (!auth) return HttpResponse.json({ error: 'UNAUTHORIZED', message: 'Token requerido' }, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const userNickname = token.replace('mock-jwt-token-', '')
    const user = mockUsers.find((u) => u.nickname === userNickname) || mockCurrentUser

    if (user.role === 'CONTESTANT') {
      return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'Solo Coach y Admin pueden crear problemas' }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>

    // Check duplicate slug
    if (mockProblems.some((p) => p.slug === body.slug)) {
      return HttpResponse.json({ error: 'SLUG_ALREADY_EXISTS', message: `Ya existe un problema con slug '${body.slug}'` }, { status: 409 })
    }

    const newProblem: ProblemDetail = {
      slug: body.slug as string,
      title: body.title as string,
      statement: (body.statement as string) || null,
      timeLimit: (body.timeLimit as number) || null,
      memoryLimit: (body.memoryLimit as number) || null,
      languageOverrides: (body.languageOverrides as []) || [],
      tags: (body.tags as string[]) || [],
      status: 'DRAFT',
      accessibility: 'PRIVATE',
      author: { nickname: user.nickname, name: user.name },
      modifiers: [{ nickname: user.nickname, name: user.name }],
      files: { testCases: false, solutions: [], checker: false, validator: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      problemJudgingUpdatedAt: null,
    }

    mockProblems.push(newProblem)
    return HttpResponse.json(newProblem, { status: 201 })
  }),

  // Update problem
  http.put(url('/problems/p/:slug'), async ({ params, request }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'PUBLISHED') {
      return HttpResponse.json({ error: 'PROBLEM_IS_PUBLISHED', message: 'No se puede modificar un problema publicado. Despublícalo primero.' }, { status: 400 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const updated = { ...problem, ...body, updatedAt: new Date().toISOString() }
    const idx = mockProblems.findIndex((p) => p.slug === slug)
    mockProblems[idx] = updated as ProblemDetail
    return HttpResponse.json(updated)
  }),

  // Delete problem
  http.delete(url('/problems/p/:slug'), async ({ params, request }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const idx = mockProblems.findIndex((p) => p.slug === slug)
    if (idx === -1) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const body = (await request.json()) as { confirmSlug?: string }
    if (!body.confirmSlug || body.confirmSlug !== slug) {
      return HttpResponse.json({ error: 'SLUG_MISMATCH', message: 'El slug de confirmación no coincide' }, { status: 400 })
    }

    mockProblems.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // Publish
  http.post(url('/problems/p/:slug/publish'), async ({ params }) => {
    await delay(400)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'PUBLISHED') {
      return HttpResponse.json({ error: 'ALREADY_PUBLISHED', message: 'El problema ya está publicado' }, { status: 409 })
    }

    problem.status = 'PUBLISHED'
    problem.updatedAt = new Date().toISOString()
    return HttpResponse.json({
      slug: problem.slug,
      status: 'PUBLISHED',
      message: 'Problema publicado exitosamente',
      validationLogs: ['✓ Campos requeridos validados', '✓ Casos de prueba válidos', '✓ Solución compilada', '✓ Solución pasó todos los casos'],
    })
  }),

  // Unpublish
  http.post(url('/problems/p/:slug/unpublish'), async ({ params }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'DRAFT') {
      return HttpResponse.json({ error: 'ALREADY_DRAFT', message: 'El problema ya está en borrador' }, { status: 409 })
    }
    const inActiveContest = mockContests.some(
      (c) => c.status === 'ACTIVE' && c.problems.some((p) => p.slug === slug),
    )
    if (inActiveContest) {
      return HttpResponse.json({
        error: 'PROBLEM_IN_ACTIVE_CONTEST',
        message: 'No se puede despublicar: el problema está siendo usado en una competencia activa',
      }, { status: 409 })
    }

    problem.status = 'DRAFT'
    problem.updatedAt = new Date().toISOString()
    return HttpResponse.json({ slug: problem.slug, status: 'DRAFT', message: 'Problema despublicado. Ahora puedes hacer cambios.' })
  }),

  // Statistics
  http.get(url('/problems/p/:slug/statistics'), async ({ params }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'DRAFT') {
      return HttpResponse.json({ error: 'PROBLEM_NOT_PUBLISHED', message: 'Las estadísticas solo están disponibles para problemas publicados' }, { status: 403 })
    }

    const stats = mockProblemStatistics[slug]
    if (!stats) {
      return HttpResponse.json({ message: 'No hay submissions aún para este problema', totalSubmissions: 0 })
    }
    return HttpResponse.json(stats)
  }),

  // Upload file
  http.post(url('/problems/p/:slug/files'), async ({ params, request }) => {
    await delay(500)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const fileType = (formData.get('fileType') as string) || 'testCases'
    const file = formData.get('file') as File | null
    const fileName = file?.name || `${fileType}.txt`

    const info = PROBLEM_FILE_TYPE_INFO[fileType as keyof typeof PROBLEM_FILE_TYPE_INFO]
    if (!info) {
      return HttpResponse.json({ error: 'PROBLEM_INVALID_FILE_TYPE', message: 'Invalid file type. Allowed: testCases, solution, checker, validator' }, { status: 400 })
    }
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    if (!(info.extensions as readonly string[]).includes(extension)) {
      return HttpResponse.json(
        { error: 'VALIDATION_ERROR', message: `Unsupported ${fileType} file type`, details: [{ field: 'file', message: `Expected ${info.extensions.join(' or ')}` }] },
        { status: 400 },
      )
    }

    if (!problem.files) {
      problem.files = { testCases: false, solutions: [], checker: false, validator: false }
    }
    if (fileType === 'solution') {
      if (!problem.files.solutions.some((sol) => sol.filename === fileName)) {
        const language = PROBLEM_LANGUAGE_BY_EXTENSION[extension] ?? 'cpp20'
        problem.files.solutions = [...problem.files.solutions, { filename: fileName, language }]
      }
    } else if (fileType === 'testCases' || fileType === 'checker' || fileType === 'validator') {
      problem.files[fileType] = true
    }

    return HttpResponse.json({
      message: 'Archivo subido exitosamente',
      fileType,
      fileName,
      files: problem.files,
    })
  }),

  // Delete file
  http.delete(url('/problems/p/:slug/files/:fileType'), async ({ params, request }) => {
    await delay(300)
    const { slug, fileType } = params as { slug: string; fileType: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem || !problem.files) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }

    const searchParams = new URL(request.url).searchParams
    const fileName = searchParams.get('fileName')

    if (fileType === 'solution' && fileName) {
      problem.files.solutions = problem.files.solutions.filter((sol) => sol.filename !== fileName)
    } else if (fileType === 'testCases' || fileType === 'checker' || fileType === 'validator') {
      problem.files[fileType] = false
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // Get modifiers
  http.get(url('/problems/p/:slug/modifiers'), async ({ params }) => {
    await delay(200)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(problem.modifiers || [])
  }),

  // Add modifier
  http.post(url('/problems/p/:slug/modifiers'), async ({ params, request }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    const body = (await request.json()) as { userNickname: string }
    const user = mockUsers.find((u) => u.nickname === body.userNickname)
    if (!user) {
      return HttpResponse.json({ error: 'USER_NOT_FOUND', message: `No existe un usuario con nickname '${body.userNickname}'` }, { status: 404 })
    }
    if (!problem.modifiers) problem.modifiers = []
    if (!problem.modifiers.some((m) => m.nickname === user.nickname)) {
      problem.modifiers = [...problem.modifiers, { nickname: user.nickname, name: user.name }]
    }
    return HttpResponse.json({ message: 'Colaborador agregado', modifiers: problem.modifiers })
  }),

  // Remove modifier
  http.delete(url('/problems/p/:slug/modifiers/:nickname'), async ({ params }) => {
    await delay(300)
    const { slug, nickname } = params as { slug: string; nickname: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem || !problem.modifiers) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    problem.modifiers = problem.modifiers.filter((m) => m.nickname !== nickname)
    return new HttpResponse(null, { status: 204 })
  }),

  // Import from ZIP
  http.post(url('/problems/import'), async ({ request }) => {
    await delay(600)
    const auth = request.headers.get('Authorization')
    if (!auth) return HttpResponse.json({ error: 'UNAUTHORIZED', message: 'Token requerido' }, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const userNickname = token.replace('mock-jwt-token-', '')
    const user = mockUsers.find((u) => u.nickname === userNickname) || mockCurrentUser

    if (user.role === 'CONTESTANT') {
      return HttpResponse.json({ error: 'INSUFFICIENT_PERMISSIONS', message: 'Solo Coach y Admin pueden crear problemas' }, { status: 403 })
    }

    const formData = await request.formData()
    const slug = formData.get('slug') as string | null
    const file = formData.get('file') as File | null

    if (!slug) {
      return HttpResponse.json({ error: 'VALIDATION_ERROR', message: "Missing required form field 'slug'" }, { status: 400 })
    }
    if (!file) {
      return HttpResponse.json({ error: 'VALIDATION_ERROR', message: "Missing required form field 'file'" }, { status: 400 })
    }
    if (mockProblems.some((p) => p.slug === slug)) {
      return HttpResponse.json({ error: 'SLUG_ALREADY_EXISTS', message: `Ya existe un problema con slug '${slug}'` }, { status: 409 })
    }

    const { default: JSZip } = await import('jszip')
    let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>
    try {
      zip = await JSZip.loadAsync(file)
    } catch {
      return HttpResponse.json({ error: 'INVALID_PACKAGE', message: 'El archivo no es un ZIP válido' }, { status: 400 })
    }

    const paths = Object.keys(zip.files)
    const yamlPath = paths.find((p) => p === 'problem.yaml' || p.endsWith('/problem.yaml'))
    if (!yamlPath) {
      return HttpResponse.json({ error: 'INVALID_PACKAGE', message: 'El ZIP debe contener un archivo problem.yaml en la raíz del problema' }, { status: 400 })
    }
    const prefix = yamlPath.slice(0, yamlPath.length - 'problem.yaml'.length)

    const yamlContent = await zip.files[yamlPath].async('string')
    const name = yamlContent.match(/^name:\s*"?([^"\n]+?)"?\s*$/m)?.[1]
    const timeLimitSec = yamlContent.match(/^time_limit:\s*([\d.]+)/m)?.[1]
    const memoryLimitMb = yamlContent.match(/^memory_limit:\s*(\d+)/m)?.[1]

    if (!name) {
      return HttpResponse.json({ error: 'INVALID_PACKAGE', message: 'problem.yaml no tiene el campo requerido: name' }, { status: 400 })
    }

    const extPattern = new RegExp(`^(checker|validator)(${PROBLEM_SOURCE_FILE_EXTENSIONS.map((e) => e.replace('.', '\\.')).join('|')})$`)
    const rootEntries = paths.filter((p) => p.startsWith(prefix) && !zip.files[p].dir).map((p) => p.slice(prefix.length))
    const checkerMatches = rootEntries.filter((p) => extPattern.test(p) && p.startsWith('checker'))
    const validatorMatches = rootEntries.filter((p) => extPattern.test(p) && p.startsWith('validator'))
    if (checkerMatches.length > 1) {
      return HttpResponse.json({ error: 'INVALID_PACKAGE', message: 'Multiple checker files found: only one is allowed' }, { status: 400 })
    }
    if (validatorMatches.length > 1) {
      return HttpResponse.json({ error: 'INVALID_PACKAGE', message: 'Multiple validator files found: only one is allowed' }, { status: 400 })
    }

    const hasSample = paths.some((p) => p.startsWith(`${prefix}data/sample/`) && !zip.files[p].dir)
    const hasSecret = paths.some((p) => p.startsWith(`${prefix}data/secret/`) && !zip.files[p].dir)
    const solutionsPrefix = `${prefix}solutions/`
    const solutionFiles = paths
      .filter((p) => p.startsWith(solutionsPrefix) && !zip.files[p].dir)
      .map((p) => p.slice(solutionsPrefix.length))
      .map((filename) => {
        const ext = filename.slice(filename.lastIndexOf('.'))
        return { filename, language: PROBLEM_LANGUAGE_BY_EXTENSION[ext] ?? 'cpp20' }
      })

    const statementPath = `${prefix}problem_statement/problem.en.tex`
    const statement = paths.includes(statementPath) ? await zip.files[statementPath].async('string') : null

    const newProblem: ProblemDetail = {
      slug,
      title: name,
      statement,
      timeLimit: timeLimitSec ? Math.round(parseFloat(timeLimitSec) * 1000) : null,
      memoryLimit: memoryLimitMb ? parseInt(memoryLimitMb, 10) : null,
      languageOverrides: [],
      tags: [],
      status: 'DRAFT',
      accessibility: 'PRIVATE',
      author: { nickname: user.nickname, name: user.name },
      modifiers: [{ nickname: user.nickname, name: user.name }],
      files: { testCases: hasSample && hasSecret, solutions: solutionFiles, checker: checkerMatches.length === 1, validator: validatorMatches.length === 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      problemJudgingUpdatedAt: null,
    }

    mockProblems.push(newProblem)
    return HttpResponse.json(newProblem, { status: 201 })
  }),

  // Admin rejudge (global, or scoped to a contest via ?contestId=)
  http.post(url('/admin/problems/:slug/rejudge'), async ({ params }) => {
    await delay(400)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
