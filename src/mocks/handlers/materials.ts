import { http, HttpResponse, delay } from 'msw'
import { mockMaterials, buildMaterialList } from '../data'
import { url } from './utils'

export const materialsHandlers = [
  // List materials in group
  http.get(url('/groups/:groupId/materials'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const sp = new URL(request.url).searchParams
    const result = buildMaterialList({
      groupId,
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      pinned: sp.get('pinned') || undefined,
      tags: sp.get('tags') || undefined,
      q: sp.get('q') || undefined,
    })
    return HttpResponse.json(result)
  }),

  // Material detail
  http.get(url('/groups/:groupId/materials/:materialId'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json(material)
  }),

  // Create material
  http.post(url('/groups/:groupId/materials'), async ({ params, request }) => {
    await delay(300)
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as Record<string, unknown>
    const newMaterial = {
      id: 'mat-new-' + Date.now(),
      title: body.title as string,
      content: (body.content as string) || '',
      tags: (body.tags as string[]) || [],
      status: 'DRAFT' as const,
      pinned: false,
      pinnedAt: null,
      author: { nickname: 'luisadmin', name: 'Luis Admin' },
      group: { id: groupId, name: 'Mock Group' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    }
    return HttpResponse.json(newMaterial, { status: 201 })
  }),

  // Update material
  http.put(url('/groups/:groupId/materials/:materialId'), async ({ params, request }) => {
    await delay(300)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...material, ...body, updatedAt: new Date().toISOString() })
  }),

  // Delete material
  http.delete(url('/groups/:groupId/materials/:materialId'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const idx = mockMaterials.findIndex((m) => m.id === materialId)
    if (idx === -1) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // Publish material
  http.post(url('/groups/:groupId/materials/:materialId/publish'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      status: 'PUBLISHED',
      publishedAt: material.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Unpublish material
  http.post(url('/groups/:groupId/materials/:materialId/unpublish'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      status: 'DRAFT',
      pinned: false,
      pinnedAt: null,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Pin material
  http.post(url('/groups/:groupId/materials/:materialId/pin'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    if (material.status === 'DRAFT') {
      return HttpResponse.json({ error: 'CANNOT_PIN_DRAFT', message: 'No se puede fijar un borrador' }, { status: 400 })
    }
    return HttpResponse.json({
      ...material,
      pinned: true,
      pinnedAt: material.pinnedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  // Unpin material
  http.post(url('/groups/:groupId/materials/:materialId/unpin'), async ({ params }) => {
    await delay(200)
    const { materialId } = params as { groupId: string; materialId: string }
    const material = mockMaterials.find((m) => m.id === materialId)
    if (!material) {
      return HttpResponse.json({ error: 'MATERIAL_NOT_FOUND', message: 'Material no encontrado' }, { status: 404 })
    }
    return HttpResponse.json({
      ...material,
      pinned: false,
      pinnedAt: null,
      updatedAt: new Date().toISOString(),
    })
  }),
]
