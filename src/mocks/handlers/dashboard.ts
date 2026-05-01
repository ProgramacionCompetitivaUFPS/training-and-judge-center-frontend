import { http, HttpResponse, delay } from 'msw'
import { mockDashboard } from '../data'
import { url } from './utils'

export const dashboardHandlers = [
  http.get(url('/users/me/dashboard'), async () => {
    await delay(300)
    return HttpResponse.json(mockDashboard)
  }),
]
