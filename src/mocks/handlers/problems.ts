import { http, HttpResponse, delay } from 'msw'
import { mockProblems, buildProblemList, mockProblemStatistics, mockUsers, mockCurrentUser } from '../data'
import type { ProblemDetail } from '@/types/problem'
import { url } from './utils'

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
      userNickname,
    })
    return HttpResponse.json(result)
  }),

  // Problem detail
  http.get(url('/problems/:slug'), async ({ params, request }) => {
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
      inputFormat: null,
      outputFormat: null,
      examples: [],
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
  http.put(url('/problems/:slug'), async ({ params, request }) => {
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
  http.delete(url('/problems/:slug'), async ({ params, request }) => {
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
  http.post(url('/problems/:slug/publish'), async ({ params }) => {
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
  http.post(url('/problems/:slug/unpublish'), async ({ params }) => {
    await delay(300)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status === 'DRAFT') {
      return HttpResponse.json({ error: 'ALREADY_DRAFT', message: 'El problema ya está en borrador' }, { status: 409 })
    }

    problem.status = 'DRAFT'
    problem.updatedAt = new Date().toISOString()
    return HttpResponse.json({ slug: problem.slug, status: 'DRAFT', message: 'Problema despublicado. Ahora puedes hacer cambios.' })
  }),

  // Statistics
  http.get(url('/problems/:slug/statistics'), async ({ params }) => {
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

  // Upload file (mock)
  http.post(url('/problems/:slug/files'), async ({ params }) => {
    await delay(500)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      message: 'Archivo subido exitosamente',
      fileType: 'testCases',
      fileName: 'testcases.zip',
      files: problem.files || { testCases: true, solutions: [], checker: false, validator: false },
    })
  }),
]
