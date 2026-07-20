import { http, HttpResponse, delay } from 'msw'
import { mockDashboard, mockProfileStats } from '../data'
import { url } from './utils'

export const dashboardHandlers = [
  http.get(url('/users/me/dashboard'), async () => {
    await delay(300)
    return HttpResponse.json(mockDashboard)
  }),
  http.get(url('/users/me/stats'), async () => {
    await delay(300)
    return HttpResponse.json(mockProfileStats)
  }),
]
