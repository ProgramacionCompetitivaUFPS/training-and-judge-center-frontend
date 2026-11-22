import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/server'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ApiClientError } from '@/lib/errors'
import {
  withBlocklyLanguage,
  getMySubmissions,
  getSubmission,
  getProblemSubmissions,
  submitSolution,
  submitContestSolution,
  submitBlocklySolution,
  submitBlocklyContestSolution,
  updateSubmissionVisibility,
  rejudgeSubmission,
  adminRejudgeSubmission,
  downloadSubmissionBlob,
} from './submissions'

const BASE = 'http://localhost:8080/api'

beforeEach(() => setAccessToken('mock-jwt-token-luisadmin'))
afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

// jsdom's FormData cannot be serialized to multipart by Node's fetch (MSW would not be able to read it),
// so multipart uploads are inspected at the fetch boundary: the URL and the FormData that were sent.
function captureUpload(responseBody: unknown, status = 201) {
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(responseBody), { status, headers: { 'Content-Type': 'application/json' } }),
  )
  return {
    url: () => String(spy.mock.calls[0][0]),
    form: () => (spy.mock.calls[0][1] as RequestInit).body as FormData,
  }
}

function listBody(submissions: Array<Record<string, unknown>>) {
  return {
    submissions,
    pagination: { page: 1, limit: 20, total: submissions.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  }
}

describe('withBlocklyLanguage', () => {
  it('cambia el lenguaje a blockly cuando el envío es de Blockly', () => {
    expect(withBlocklyLanguage({ language: 'python310', isBlocklySubmission: true }).language).toBe('blockly')
  })

  it.each([
    [{ language: 'python310', isBlocklySubmission: false }, 'python310'],
    [{ language: 'cpp20' }, 'cpp20'],
  ])('conserva el lenguaje %o cuando no es un envío de Blockly', (sub, expected) => {
    expect(withBlocklyLanguage(sub).language).toBe(expected)
  })
})

describe('getMySubmissions', () => {
  it('pide /users/me/submissions con los filtros como query params', async () => {
    let requested: URL | undefined
    server.use(
      http.get(`${BASE}/users/me/submissions`, ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json(listBody([]))
      }),
    )

    await getMySubmissions({ page: 2, limit: 5, verdict: 'ACCEPTED', problemSlug: 'two-sum' })

    expect(requested?.searchParams.get('page')).toBe('2')
    expect(requested?.searchParams.get('limit')).toBe('5')
    expect(requested?.searchParams.get('verdict')).toBe('ACCEPTED')
    expect(requested?.searchParams.get('problemSlug')).toBe('two-sum')
  })

  it('marca como blockly solo los envíos creados con el editor de bloques', async () => {
    server.use(
      http.get(`${BASE}/users/me/submissions`, () =>
        HttpResponse.json(
          listBody([
            { id: 's1', language: 'python310', isBlocklySubmission: true },
            { id: 's2', language: 'python310', isBlocklySubmission: false },
          ]),
        ),
      ),
    )

    const result = await getMySubmissions()

    expect(result.submissions.map((s) => s.language)).toEqual(['blockly', 'python310'])
  })
})

describe('getSubmission', () => {
  it('devuelve el detalle con lenguaje blockly para un envío de Blockly', async () => {
    server.use(
      http.get(`${BASE}/submissions/sub-9`, () =>
        HttpResponse.json({ id: 'sub-9', language: 'python310', isBlocklySubmission: true }),
      ),
    )

    const result = await getSubmission('sub-9')

    expect(result.id).toBe('sub-9')
    expect(result.language).toBe('blockly')
  })

  it('propaga ApiClientError 404 cuando el envío no existe', async () => {
    server.use(
      http.get(`${BASE}/submissions/missing`, () =>
        HttpResponse.json({ error: 'NOT_FOUND', message: 'no existe' }, { status: 404 }),
      ),
    )

    const error = await getSubmission('missing').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).status).toBe(404)
  })
})

describe('getProblemSubmissions', () => {
  it('pide /problems/p/:slug/submissions y mapea el lenguaje de Blockly', async () => {
    let requested: URL | undefined
    server.use(
      http.get(`${BASE}/problems/p/two-sum/submissions`, ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json(listBody([{ id: 's1', language: 'python310', isBlocklySubmission: true }]))
      }),
    )

    const result = await getProblemSubmissions('two-sum', { page: 3 })

    expect(requested?.searchParams.get('page')).toBe('3')
    expect(result.submissions[0].language).toBe('blockly')
  })
})

describe('submitSolution', () => {
  it('envía file, language y compiler como multipart a /problems/p/:slug/submissions', async () => {
    const upload = captureUpload({ id: 'sub-new', status: 'PENDING' })

    const result = await submitSolution('two-sum', new File(['int main(){}'], 'sol.cpp'), 'cpp20', 'g++')

    expect(result.id).toBe('sub-new')
    expect(upload.url()).toBe(`${BASE}/problems/p/two-sum/submissions`)
    expect(upload.form().get('language')).toBe('cpp20')
    expect(upload.form().get('compiler')).toBe('g++')
    expect((upload.form().get('file') as File).name).toBe('sol.cpp')
  })
})

describe('submitContestSolution', () => {
  it('envía a la ruta del contest con el grupo, contest y problema', async () => {
    const upload = captureUpload({ id: 'sub-c', status: 'PENDING' })

    const result = await submitContestSolution(
      'group-1',
      'contest-2',
      'two-sum',
      new File(['class A{}'], 'A.java'),
      'java17',
      'javac',
    )

    expect(result.id).toBe('sub-c')
    expect(upload.url()).toBe(`${BASE}/groups/group-1/contests/contest-2/problems/two-sum/submissions`)
    expect(upload.form().get('language')).toBe('java17')
    expect(upload.form().get('compiler')).toBe('javac')
  })

  it('propaga el error del servidor cuando el contest ya terminó', async () => {
    captureUpload({ error: 'CONTEST_ENDED', message: 'terminó' }, 409)

    const error = await submitContestSolution('group-1', 'contest-2', 'two-sum', new File(['x'], 'a.py'), 'python310', 'py')
      .catch((e: unknown) => e)

    expect((error as ApiClientError).status).toBe(409)
    expect((error as ApiClientError).code).toBe('CONTEST_ENDED')
  })
})

describe('submitBlocklySolution', () => {
  it('envía el código como solution.py, el workspace como workspace.xml y language python310/compiler py', async () => {
    const upload = captureUpload({ id: 'sub-b', status: 'PENDING' })

    await submitBlocklySolution('two-sum', 'print(1)', '<xml/>')

    expect(upload.url()).toBe(`${BASE}/problems/p/two-sum/submissions`)
    expect(upload.form().get('language')).toBe('python310')
    expect(upload.form().get('compiler')).toBe('py')
    const file = upload.form().get('file') as File
    expect(file.name).toBe('solution.py')
    expect(await file.text()).toBe('print(1)')
    const workspace = upload.form().get('workspaceXml') as File
    expect(workspace.name).toBe('workspace.xml')
    expect(await workspace.text()).toBe('<xml/>')
  })
})

describe('submitBlocklyContestSolution', () => {
  it('envía el envío de Blockly a la ruta del contest', async () => {
    const upload = captureUpload({ id: 'sub-bc', status: 'PENDING' })

    const result = await submitBlocklyContestSolution('group-1', 'contest-2', 'two-sum', 'print(2)', '<xml a="b"/>')

    expect(result.id).toBe('sub-bc')
    expect(upload.url()).toBe(`${BASE}/groups/group-1/contests/contest-2/problems/two-sum/submissions`)
    expect(upload.form().get('language')).toBe('python310')
    expect(await (upload.form().get('workspaceXml') as File).text()).toBe('<xml a="b"/>')
  })
})

describe('updateSubmissionVisibility', () => {
  it('hace PATCH a /submissions/:id/visibility con el cuerpo indicado', async () => {
    let body: unknown
    server.use(
      http.patch(`${BASE}/submissions/sub-1/visibility`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'sub-1', visibility: 'PUBLIC' })
      }),
    )

    const result = await updateSubmissionVisibility('sub-1', { visibility: 'PUBLIC' })

    expect(body).toEqual({ visibility: 'PUBLIC' })
    expect(result).toEqual({ id: 'sub-1', visibility: 'PUBLIC' })
  })
})

describe('rejudge', () => {
  it('rejudgeSubmission hace POST a /submissions/:id/rejudge', async () => {
    let called = ''
    server.use(
      http.post(`${BASE}/submissions/sub-1/rejudge`, ({ request }) => {
        called = `${request.method} ${new URL(request.url).pathname}`
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await rejudgeSubmission('sub-1')

    expect(called).toBe('POST /api/submissions/sub-1/rejudge')
  })

  it('adminRejudgeSubmission hace POST a /admin/submissions/:id/rejudge', async () => {
    let called = ''
    server.use(
      http.post(`${BASE}/admin/submissions/sub-1/rejudge`, ({ request }) => {
        called = `${request.method} ${new URL(request.url).pathname}`
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await adminRejudgeSubmission('sub-1')

    expect(called).toBe('POST /api/admin/submissions/sub-1/rejudge')
  })
})

describe('downloadSubmissionBlob', () => {
  it('descarga el código como archivo de texto con el nombre indicado y libera la URL', () => {
    const createUrl = vi.fn(() => 'blob:fake-url')
    const revokeUrl = vi.fn()
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('solution.cpp')
      expect(this.href).toBe('blob:fake-url')
    })

    downloadSubmissionBlob('int main(){}', 'solution.cpp')

    expect(click).toHaveBeenCalledTimes(1)
    const blob = (createUrl.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(12)
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake-url')
  })
})
