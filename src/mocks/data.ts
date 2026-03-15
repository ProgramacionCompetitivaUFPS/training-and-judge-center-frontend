import type { User, UserDashboard, PublicUserProfile, AdminUserListResponse } from '@/types/user'

// === Mock Users ===

export const mockCurrentUser: User = {
  email: 'admin@trainingcenter.com',
  name: 'Luis Admin',
  nickname: 'luisadmin',
  country: 'Colombia',
  city: 'Bogotá',
  institution: 'Universidad Nacional',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2024-06-15T10:00:00Z',
  updatedAt: '2025-01-10T14:30:00Z',
}

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    email: 'coach@trainingcenter.com',
    name: 'María Coach',
    nickname: 'mariacoach',
    country: 'México',
    city: 'CDMX',
    institution: 'UNAM',
    role: 'COACH',
    status: 'ACTIVE',
    createdAt: '2024-08-20T08:00:00Z',
  },
  {
    email: 'contestant1@trainingcenter.com',
    name: 'Carlos Pérez',
    nickname: 'carloscp',
    country: 'Argentina',
    city: 'Buenos Aires',
    institution: 'UBA',
    role: 'CONTESTANT',
    status: 'ACTIVE',
    createdAt: '2024-09-01T12:00:00Z',
  },
  {
    email: 'contestant2@trainingcenter.com',
    name: 'Ana García',
    nickname: 'anagarcia',
    country: 'Chile',
    city: 'Santiago',
    institution: 'Universidad de Chile',
    role: 'CONTESTANT',
    status: 'ACTIVE',
    createdAt: '2024-10-05T09:00:00Z',
  },
  {
    email: 'contestant3@trainingcenter.com',
    name: 'Pedro Inactive',
    nickname: 'pedroinactive',
    country: 'Perú',
    city: 'Lima',
    institution: 'PUCP',
    role: 'CONTESTANT',
    status: 'DEACTIVATED',
    createdAt: '2024-07-01T11:00:00Z',
  },
  {
    email: 'sofia@trainingcenter.com',
    name: 'Sofía Rodríguez',
    nickname: 'sofiarodriguez',
    country: 'Colombia',
    city: 'Medellín',
    institution: 'EAFIT',
    role: 'CONTESTANT',
    status: 'ACTIVE',
    createdAt: '2024-11-15T14:00:00Z',
  },
  {
    email: 'diego@trainingcenter.com',
    name: 'Diego Martínez',
    nickname: 'diegomartinez',
    country: 'Ecuador',
    city: 'Quito',
    institution: 'EPN',
    role: 'COACH',
    status: 'ACTIVE',
    createdAt: '2024-12-01T10:00:00Z',
  },
]

// === Mock Dashboard ===

export const mockDashboard: UserDashboard = {
  totalSubmissions: 47,
  acceptedSubmissions: 32,
  problemsSolved: 18,
  contestsParticipated: 5,
  recentSubmissions: [
    {
      id: 'sub-1',
      problemSlug: 'two-sum',
      problemTitle: 'Two Sum',
      status: 'ACCEPTED',
      language: 'cpp20',
      submittedAt: '2026-03-14T18:30:00Z',
    },
    {
      id: 'sub-2',
      problemSlug: 'binary-search',
      problemTitle: 'Binary Search',
      status: 'WRONG_ANSWER',
      language: 'python310',
      submittedAt: '2026-03-13T15:20:00Z',
    },
    {
      id: 'sub-3',
      problemSlug: 'merge-sort',
      problemTitle: 'Merge Sort',
      status: 'TIME_LIMIT_EXCEEDED',
      language: 'java17',
      submittedAt: '2026-03-12T10:45:00Z',
    },
    {
      id: 'sub-4',
      problemSlug: 'graph-bfs',
      problemTitle: 'Graph BFS',
      status: 'ACCEPTED',
      language: 'cpp20',
      submittedAt: '2026-03-11T20:00:00Z',
    },
    {
      id: 'sub-5',
      problemSlug: 'dynamic-knapsack',
      problemTitle: 'Dynamic Knapsack',
      status: 'COMPILATION_ERROR',
      language: 'cpp20',
      submittedAt: '2026-03-10T09:15:00Z',
    },
  ],
  upcomingContests: [
    {
      id: 'contest-1',
      name: 'Contest Semanal #12',
      startTime: '2026-03-20T14:00:00Z',
      endTime: '2026-03-20T19:00:00Z',
      groupName: 'Grupo ICPC Colombia',
    },
    {
      id: 'contest-2',
      name: 'Práctica Grafos',
      startTime: '2026-03-22T16:00:00Z',
      endTime: '2026-03-22T20:00:00Z',
      groupName: 'Entrenamiento Avanzado',
    },
  ],
}

// === Helper to build public profile from User ===

export function toPublicProfile(user: User): PublicUserProfile {
  return {
    name: user.name,
    nickname: user.nickname,
    institution: user.institution,
    role: user.role,
    createdAt: user.createdAt,
  }
}

// === Helper to build paginated admin user list ===

export function buildAdminUserList(
  params: { page?: number; limit?: number; search?: string; role?: string; status?: string }
): AdminUserListResponse {
  let filtered = [...mockUsers]

  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(s) || u.nickname.toLowerCase().includes(s)
    )
  }
  if (params.role) {
    filtered = filtered.filter((u) => u.role === params.role)
  }
  if (params.status) {
    filtered = filtered.filter((u) => u.status === params.status)
  }

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    data: paged,
    pagination: {
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      itemsPerPage: limit,
    },
  }
}
