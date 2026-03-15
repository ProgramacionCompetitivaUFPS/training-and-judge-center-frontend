import type { User, UserDashboard, PublicUserProfile, AdminUserListResponse } from '@/types/user'
import type { GroupListItem, GroupDetail, MyGroupItem, GroupMember, JoinRequest } from '@/types/group'

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

// === Mock Groups ===

export const mockGroups: GroupListItem[] = [
  {
    id: 'group-1',
    name: 'ICPC Colombia',
    description: 'Grupo oficial de entrenamiento para ICPC Colombia. Práctica semanal y contests.',
    visibility: 'VISIBLE',
    joinPolicy: 'REQUEST',
    isGlobal: false,
    memberCount: 45,
    leadCount: 3,
    contestCount: 12,
    materialCount: 8,
    activeContestCount: 1,
    userRole: 'LEAD',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'group-2',
    name: 'Entrenamiento Avanzado',
    description: 'Grupo para competidores avanzados. Temas: grafos, DP, geometría computacional.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: false,
    memberCount: 22,
    leadCount: 2,
    contestCount: 6,
    materialCount: 15,
    activeContestCount: 0,
    userRole: 'MEMBER',
    createdAt: '2024-08-15T08:00:00Z',
  },
  {
    id: 'group-3',
    name: 'Principiantes CP',
    description: 'Grupo para quienes inician en programación competitiva. Bienvenidos todos.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: false,
    memberCount: 78,
    leadCount: 4,
    contestCount: 20,
    materialCount: 25,
    activeContestCount: 2,
    userRole: null,
    createdAt: '2024-09-01T12:00:00Z',
  },
  {
    id: 'group-4',
    name: 'Equipo Privado UBA',
    description: 'Grupo privado del equipo de la UBA.',
    visibility: 'NOT_VISIBLE',
    joinPolicy: 'INVITE',
    isGlobal: false,
    memberCount: 8,
    leadCount: 1,
    contestCount: 3,
    materialCount: 2,
    activeContestCount: 0,
    userRole: null,
    createdAt: '2025-01-10T14:00:00Z',
  },
  {
    id: 'group-global',
    name: 'Training Center Global',
    description: 'Grupo global de la plataforma. Todos los usuarios pertenecen automáticamente.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: true,
    memberCount: 150,
    leadCount: 5,
    contestCount: 30,
    materialCount: 40,
    activeContestCount: 3,
    userRole: 'MEMBER',
    createdAt: '2024-01-01T00:00:00Z',
  },
]

export const mockGroupDetails: Record<string, GroupDetail> = {
  'group-1': {
    id: 'group-1',
    name: 'ICPC Colombia',
    description: 'Grupo oficial de entrenamiento para ICPC Colombia. Práctica semanal y contests.',
    visibility: 'VISIBLE',
    joinPolicy: 'REQUEST',
    isGlobal: false,
    statistics: {
      memberCount: 45,
      leadCount: 3,
      contestCount: 12,
      materialCount: 8,
      activeContestCount: 1,
      scheduledContestCount: 2,
      finishedContestCount: 9,
    },
    leads: [
      { userId: 'u1', nickname: 'luisadmin', name: 'Luis Admin' },
      { userId: 'u2', nickname: 'mariacoach', name: 'María Coach' },
      { userId: 'u7', nickname: 'diegomartinez', name: 'Diego Martínez' },
    ],
    userMembership: { isMember: true, role: 'LEAD', joinedAt: '2024-06-01T10:00:00Z', hasPendingRequest: false, hasPendingInvitation: false },
    createdAt: '2024-06-01T10:00:00Z',
  },
  'group-2': {
    id: 'group-2',
    name: 'Entrenamiento Avanzado',
    description: 'Grupo para competidores avanzados. Temas: grafos, DP, geometría computacional.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: false,
    statistics: {
      memberCount: 22,
      leadCount: 2,
      contestCount: 6,
      materialCount: 15,
      activeContestCount: 0,
      scheduledContestCount: 1,
      finishedContestCount: 5,
    },
    leads: [
      { userId: 'u2', nickname: 'mariacoach', name: 'María Coach' },
      { userId: 'u7', nickname: 'diegomartinez', name: 'Diego Martínez' },
    ],
    userMembership: { isMember: true, role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z', hasPendingRequest: false, hasPendingInvitation: false },
    createdAt: '2024-08-15T08:00:00Z',
  },
  'group-3': {
    id: 'group-3',
    name: 'Principiantes CP',
    description: 'Grupo para quienes inician en programación competitiva. Bienvenidos todos.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: false,
    statistics: {
      memberCount: 78,
      leadCount: 4,
      contestCount: 20,
      materialCount: 25,
      activeContestCount: 2,
      scheduledContestCount: 3,
      finishedContestCount: 15,
    },
    leads: [
      { userId: 'u1', nickname: 'luisadmin', name: 'Luis Admin' },
    ],
    userMembership: { isMember: false, role: null, joinedAt: null, hasPendingRequest: false, hasPendingInvitation: false },
    createdAt: '2024-09-01T12:00:00Z',
  },
}

export const mockGroupMembers: Record<string, GroupMember[]> = {
  'group-1': [
    { groupId: 'group-1', userId: 'u1', nickname: 'luisadmin', name: 'Luis Admin', role: 'LEAD', joinedAt: '2024-06-01T10:00:00Z' },
    { groupId: 'group-1', userId: 'u2', nickname: 'mariacoach', name: 'María Coach', role: 'LEAD', joinedAt: '2024-06-05T08:00:00Z' },
    { groupId: 'group-1', userId: 'u3', nickname: 'carloscp', name: 'Carlos Pérez', role: 'MEMBER', joinedAt: '2024-07-10T12:00:00Z' },
    { groupId: 'group-1', userId: 'u4', nickname: 'anagarcia', name: 'Ana García', role: 'MEMBER', joinedAt: '2024-08-20T09:00:00Z' },
    { groupId: 'group-1', userId: 'u6', nickname: 'sofiarodriguez', name: 'Sofía Rodríguez', role: 'MEMBER', joinedAt: '2024-11-20T14:00:00Z' },
    { groupId: 'group-1', userId: 'u7', nickname: 'diegomartinez', name: 'Diego Martínez', role: 'LEAD', joinedAt: '2024-12-05T10:00:00Z' },
  ],
  'group-2': [
    { groupId: 'group-2', userId: 'u2', nickname: 'mariacoach', name: 'María Coach', role: 'LEAD', joinedAt: '2024-08-15T08:00:00Z' },
    { groupId: 'group-2', userId: 'u3', nickname: 'carloscp', name: 'Carlos Pérez', role: 'MEMBER', joinedAt: '2024-09-01T12:00:00Z' },
    { groupId: 'group-2', userId: 'u7', nickname: 'diegomartinez', name: 'Diego Martínez', role: 'LEAD', joinedAt: '2024-09-10T10:00:00Z' },
  ],
}

export const mockJoinRequests: Record<string, JoinRequest[]> = {
  'group-1': [
    {
      id: 'req-1',
      groupId: 'group-1',
      requester: { userId: 'u6', nickname: 'sofiarodriguez', name: 'Sofía Rodríguez' },
      message: 'Me gustaría unirme para entrenar para ICPC.',
      status: 'PENDING',
      createdAt: '2026-03-10T14:00:00Z',
    },
  ],
}

export const mockMyGroups: MyGroupItem[] = [
  {
    id: 'group-1',
    name: 'ICPC Colombia',
    description: 'Grupo oficial de entrenamiento para ICPC Colombia.',
    visibility: 'VISIBLE',
    joinPolicy: 'REQUEST',
    isGlobal: false,
    myRole: 'LEAD',
    joinedAt: '2024-06-01T10:00:00Z',
    memberCount: 45,
    contestCount: 12,
    materialCount: 8,
    activeContestCount: 1,
  },
  {
    id: 'group-2',
    name: 'Entrenamiento Avanzado',
    description: 'Grupo para competidores avanzados.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: false,
    myRole: 'MEMBER',
    joinedAt: '2024-09-01T12:00:00Z',
    memberCount: 22,
    contestCount: 6,
    materialCount: 15,
    activeContestCount: 0,
  },
  {
    id: 'group-global',
    name: 'Training Center Global',
    description: 'Grupo global de la plataforma.',
    visibility: 'VISIBLE',
    joinPolicy: 'OPEN',
    isGlobal: true,
    myRole: 'MEMBER',
    joinedAt: '2024-01-01T00:00:00Z',
    memberCount: 150,
    contestCount: 30,
    materialCount: 40,
    activeContestCount: 3,
  },
]

// === Group helpers ===

export function buildGroupList(params: {
  page?: number
  limit?: number
  search?: string
  joinPolicy?: string
  visibility?: string
}) {
  let filtered = [...mockGroups]

  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter((g) => g.name.toLowerCase().includes(s) || g.description?.toLowerCase().includes(s))
  }
  if (params.joinPolicy) {
    filtered = filtered.filter((g) => g.joinPolicy === params.joinPolicy)
  }
  if (params.visibility) {
    filtered = filtered.filter((g) => g.visibility === params.visibility)
  }

  const page = params.page || 1
  const limit = params.limit || 10
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    groups: paged,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      hasNextPage: start + limit < filtered.length,
      hasPrevPage: page > 1,
    },
  }
}

export function buildMyGroupsList(params: {
  page?: number
  limit?: number
  search?: string
  role?: string
}) {
  let filtered = [...mockMyGroups]

  if (params.search) {
    const s = params.search.toLowerCase()
    filtered = filtered.filter((g) => g.name.toLowerCase().includes(s))
  }
  if (params.role) {
    filtered = filtered.filter((g) => g.myRole === params.role)
  }

  const page = params.page || 1
  const limit = params.limit || 10
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    groups: paged,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      hasNextPage: start + limit < filtered.length,
      hasPrevPage: page > 1,
    },
  }
}
