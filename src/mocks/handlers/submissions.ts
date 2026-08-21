import { http, HttpResponse, delay } from 'msw'
import { mockSubmissions, buildMySubmissionsList, buildProblemSubmissionsList, mockProblems } from '../data'
import { url } from './utils'

export const submissionsHandlers = [
  // My submissions
  http.get(url('/users/me/submissions'), async ({ request }) => {
    await delay(300)
    const sp = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')

    const result = buildMySubmissionsList({
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      verdict: sp.get('verdict') || undefined,
      problemSlug: sp.get('problemSlug') || undefined,
      language: sp.get('language') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      userNickname: userNickname || 'luisadmin',
    })
    return HttpResponse.json(result)
  }),

  // Submission detail
  http.get(url('/submissions/:id'), async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'SUBMISSION_NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    return HttpResponse.json(submission)
  }),

  // Update visibility
  http.patch(url('/submissions/:id/visibility'), async ({ params, request }) => {
    await delay(200)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    const body = (await request.json()) as { visibility: 'PUBLIC' | 'PRIVATE' }
    submission.visibility = body.visibility
    return HttpResponse.json({ id: submission.id, visibility: submission.visibility, message: 'Visibilidad actualizada' })
  }),

  // Rejudge submission (owner/self)
  http.post(url('/submissions/:id/rejudge'), async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    submission.status = 'PENDING'
    return new HttpResponse(null, { status: 204 })
  }),

  // Rejudge submission (admin)
  http.post(url('/admin/submissions/:id/rejudge'), async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const submission = mockSubmissions.find((s) => s.id === id)
    if (!submission) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Submission no encontrada' }, { status: 404 })
    }
    submission.status = 'PENDING'
    return new HttpResponse(null, { status: 204 })
  }),

  // List problem submissions
  http.get(url('/problems/p/:slug/submissions'), async ({ params, request }) => {
    await delay(200)
    const { slug } = params as { slug: string }
    const searchParams = new URL(request.url).searchParams
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    const userNickname = token.replace('mock-jwt-token-', '')
    const result = buildProblemSubmissionsList({
      problemSlug: slug,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      verdict: searchParams.get('verdict') || undefined,
      language: searchParams.get('language') || undefined,
      mine: searchParams.get('mine') === 'true',
      userNickname: userNickname || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Submit solution (practice)
  http.post(url('/problems/p/:slug/submissions'), async ({ params, request }) => {
    await delay(500)
    const { slug } = params as { slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    if (!problem) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Problema no encontrado' }, { status: 404 })
    }
    if (problem.status !== 'PUBLISHED') {
      return HttpResponse.json({ error: 'PROBLEM_NOT_PUBLISHED', message: 'Solo problemas publicados aceptan submissions' }, { status: 400 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') || ''
    // userNickname available for future use
    void token

    const newId = 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

    // Detect Blockly submission via FormData
    let isBlockly = false
    try {
      const formData = await request.formData()
      isBlockly = formData.get('blocklySubmission') === '1'
    } catch {
      // Not FormData — regular JSON submission
    }

    return HttpResponse.json({
      id: newId,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      problem: { slug: problem.slug, title: problem.title },
      language: isBlockly ? 'Blockly' : 'cpp20',
      compiler: isBlockly ? 'python3' : 'g++',
      fileSize: 1024,
      fileHash: 'mock-hash-' + newId,
    }, { status: 201 })
  }),

  // Submit solution (contest)
  http.post(url('/groups/:groupId/contests/:contestId/problems/:slug/submissions'), async ({ params, request }) => {
    await delay(500)
    const { slug } = params as { groupId: string; contestId: string; slug: string }
    const problem = mockProblems.find((p) => p.slug === slug)
    const newId = 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

    // Detect Blockly submission via FormData
    let isBlockly = false
    try {
      const formData = await request.formData()
      isBlockly = formData.get('blocklySubmission') === '1'
    } catch {
      // Not FormData — regular JSON submission
    }

    return HttpResponse.json({
      id: newId,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      problem: { slug, title: problem?.title || slug },
      language: isBlockly ? 'Blockly' : 'cpp20',
      compiler: isBlockly ? 'python3' : 'g++',
      fileSize: 1024,
      fileHash: 'mock-hash-' + newId,
    }, { status: 201 })
  }),
]
