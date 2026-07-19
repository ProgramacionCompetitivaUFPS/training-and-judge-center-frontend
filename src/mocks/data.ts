import type { User, UserDashboard, UserProfileStats, PublicUserProfile, AdminUserListResponse } from '@/types/user'
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
    name: 'Pedro Inactivo',
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
  recentSubmissions: [
    { id: 'sub-1', problemSlug: 'two-sum', problemTitle: 'Two Sum', verdict: 'ACCEPTED', language: 'cpp20', submittedAt: '2026-03-14T18:30:00Z', executionTime: 45, memoryKb: 2048 },
    { id: 'sub-2', problemSlug: 'binary-search', problemTitle: 'Binary Search', verdict: 'WRONG_ANSWER', language: 'python310', submittedAt: '2026-03-13T15:20:00Z', executionTime: 120, memoryKb: 1024 },
    { id: 'sub-3', problemSlug: 'merge-sort', problemTitle: 'Merge Sort', verdict: 'TIME_LIMIT_EXCEEDED', language: 'java17', submittedAt: '2026-03-12T10:45:00Z', executionTime: null, memoryKb: null },
    { id: 'sub-4', problemSlug: 'graph-bfs', problemTitle: 'Graph BFS', verdict: 'ACCEPTED', language: 'cpp20', submittedAt: '2026-03-11T20:00:00Z', executionTime: 30, memoryKb: 512 },
    { id: 'sub-5', problemSlug: 'dynamic-knapsack', problemTitle: 'Dynamic Knapsack', verdict: 'COMPILATION_ERROR', language: 'cpp20', submittedAt: '2026-03-10T09:15:00Z', executionTime: null, memoryKb: null },
  ],
  upcomingContests: [
    {
      id: 'contest-1',
      name: 'Contest Semanal #12',
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 300,
      groupId: 'group-1',
      groupName: 'ICPC Colombia',
    },
    {
      id: 'contest-2',
      name: 'Práctica Grafos',
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 240,
      groupId: 'group-2',
      groupName: 'Entrenamiento Avanzado',
    },
  ],
  activeContests: [],
  problemsSolved: 18,
  materialsCount: 4,
  streak: { current: 3, maximum: 7 },
  recentContestResults: [
    { contestId: 'contest-3', contestName: 'Weekly Contest #44', position: 23, problemsSolved: 3, penalty: 145 },
  ],
}

export const mockProfileStats: UserProfileStats = {
  problemsSolved: 18,
  totalSubmissions: 47,
  acceptedSubmissions: 32,
  contestsParticipated: 5,
  ranking: { position: 12, totalUsers: 150 },
  topicStats: [
    { tag: 'graphs', solved: 15 },
    { tag: 'dp', solved: 12 },
    { tag: 'arrays', solved: 10 },
    { tag: 'binary-search', solved: 9 },
    { tag: 'strings', solved: 8 },
    { tag: 'sorting', solved: 7 },
    { tag: 'data-structures', solved: 6 },
    { tag: 'bfs', solved: 6 },
    { tag: 'dfs', solved: 5 },
    { tag: 'greedy', solved: 5 },
    { tag: 'math', solved: 4 },
    { tag: 'trees', solved: 4 },
    { tag: 'geometry', solved: 3 },
    { tag: 'number-theory', solved: 3 },
    { tag: 'backtracking', solved: 2 },
    { tag: 'two-pointers', solved: 2 },
    { tag: 'segment-tree', solved: 2 },
    { tag: 'hashing', solved: 1 },
    { tag: 'bit-manipulation', solved: 1 },
    { tag: 'disjoint-set', solved: 1 },
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
    unreadNotifications: 3,
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
    unreadNotifications: 0,
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
    unreadNotifications: 0,
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

// === Mock Problems ===

import type { ProblemDetail, ProblemListItem, ProblemStatistics } from '@/types/problem'

export const mockProblems: ProblemDetail[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    statement: 'Dado un arreglo de $n$ enteros y un entero objetivo $target$, encuentra dos índices $i$ y $j$ tales que $nums[i] + nums[j] = target$ con $i \\neq j$.\n\nPuedes asumir que cada entrada tiene exactamente una solución y no puedes usar el mismo elemento dos veces.\n\n### Restricciones\n\n- $2 \\leq n \\leq 10^4$\n- $-10^9 \\leq nums[i] \\leq 10^9$\n- $-10^9 \\leq target \\leq 10^9$\n- Existe exactamente una solución válida.',
    inputFormat: 'La primera línea contiene dos enteros $n$ y $target$.\n\nLa segunda línea contiene $n$ enteros separados por espacios.',
    outputFormat: 'Imprime dos enteros $i$ y $j$ (0-indexed) separados por un espacio, tales que $nums[i] + nums[j] = target$.',
    examples: [
      { input: '4 9\n2 7 11 15', output: '0 1', explanation: '$nums[0] + nums[1] = 2 + 7 = 9$' },
      { input: '3 6\n3 2 4', output: '1 2' },
      { input: '2 6\n3 3', output: '0 1' },
    ],
    timeLimit: 2000,
    memoryLimit: 256,
    languageOverrides: [{ language: 'python310', timeLimit: 4000 }],
    tags: ['arrays', 'hash-table'],
    status: 'PUBLISHED',
    accessibility: 'PUBLIC',
    author: { nickname: 'mariacoach', name: 'María Coach' },
    modifiers: [
      { nickname: 'mariacoach', name: 'María Coach' },
      { nickname: 'luisadmin', name: 'Luis Admin' },
    ],
    files: { testCases: true, solutions: ['solution.cpp', 'solution.py'], checker: false, validator: true },
    createdAt: '2025-06-10T10:00:00Z',
    updatedAt: '2025-07-01T14:00:00Z',
    problemJudgingUpdatedAt: '2025-07-01T14:00:00Z',
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    statement: 'Dado un arreglo ordenado de $n$ enteros distintos y un valor objetivo $target$, determina el índice donde se encuentra $target$. Si no existe, imprime $-1$.\n\nDebes implementar una solución con complejidad $O(\\log n)$.\n\n### Restricciones\n\n- $1 \\leq n \\leq 10^5$\n- $-10^9 \\leq nums[i] \\leq 10^9$\n- El arreglo está ordenado de forma estrictamente creciente.',
    inputFormat: 'La primera línea contiene dos enteros $n$ y $target$.\n\nLa segunda línea contiene $n$ enteros ordenados de menor a mayor.',
    outputFormat: 'Imprime un entero: el índice (0-indexed) de $target$ en el arreglo, o $-1$ si no se encuentra.',
    examples: [
      { input: '6 9\n-1 0 3 5 9 12', output: '4' },
      { input: '6 2\n-1 0 3 5 9 12', output: '-1' },
    ],
    timeLimit: 1000,
    memoryLimit: 128,
    languageOverrides: [],
    tags: ['algorithms', 'binary-search'],
    status: 'PUBLISHED',
    accessibility: 'PUBLIC',
    author: { nickname: 'luisadmin', name: 'Luis Admin' },
    createdAt: '2025-07-15T08:00:00Z',
    updatedAt: '2025-08-01T12:00:00Z',
    problemJudgingUpdatedAt: '2025-08-01T12:00:00Z',
  },
  {
    slug: 'merge-sort',
    title: 'Merge Sort',
    statement: 'Implementa el algoritmo de **Merge Sort**. Dado un arreglo de $n$ enteros, ordénalos de forma no decreciente.\n\n### Restricciones\n\n- $1 \\leq n \\leq 2 \\times 10^5$\n- $-10^9 \\leq a_i \\leq 10^9$',
    inputFormat: 'La primera línea contiene un entero $n$.\n\nLa segunda línea contiene $n$ enteros separados por espacios.',
    outputFormat: 'Imprime $n$ enteros separados por espacios: el arreglo ordenado.',
    examples: [
      { input: '5\n5 2 3 1 4', output: '1 2 3 4 5' },
      { input: '3\n-1 -5 3', output: '-5 -1 3' },
    ],
    timeLimit: 3000,
    memoryLimit: 512,
    languageOverrides: [{ language: 'java17', memoryLimit: 1024 }],
    tags: ['sorting', 'divide-and-conquer'],
    status: 'PUBLISHED',
    accessibility: 'PRIVATE',
    author: { nickname: 'mariacoach', name: 'María Coach' },
    modifiers: [{ nickname: 'mariacoach', name: 'María Coach' }],
    files: { testCases: true, solutions: ['solution.cpp'], checker: false, validator: false },
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-09-05T11:00:00Z',
    problemJudgingUpdatedAt: '2025-09-05T11:00:00Z',
  },
  {
    slug: 'graph-bfs',
    title: 'Graph BFS',
    statement: 'Dado un grafo no dirigido y no ponderado con $n$ vértices y $m$ aristas, y un vértice fuente $s$, encuentra la distancia mínima desde $s$ a todos los demás vértices usando BFS.\n\nSi un vértice no es alcanzable desde $s$, su distancia es $-1$.',
    inputFormat: 'La primera línea contiene tres enteros $n$, $m$ y $s$ ($1 \\leq n \\leq 10^5$, $0 \\leq m \\leq 2 \\times 10^5$, $1 \\leq s \\leq n$).\n\nLas siguientes $m$ líneas contienen dos enteros $u$ y $v$ ($1 \\leq u, v \\leq n$, $u \\neq v$) representando una arista no dirigida.\n\nSe garantiza que no hay aristas múltiples ni bucles.',
    outputFormat: 'Imprime $n$ enteros separados por espacios: la distancia mínima desde $s$ a cada vértice (1-indexed).\n\nSi un vértice no es alcanzable desde $s$, imprime $-1$ para ese vértice.',
    examples: [
      { input: '4 4 1\n1 2\n1 3\n2 4\n3 4', output: '0 1 1 2', explanation: 'Desde el vértice 1: distancia a 2 es 1, a 3 es 1, a 4 es 2.' },
      { input: '3 1 1\n1 2', output: '0 1 -1' },
    ],
    timeLimit: 2000,
    memoryLimit: 256,
    languageOverrides: [],
    tags: ['graphs', 'bfs'],
    status: 'PUBLISHED',
    accessibility: 'PUBLIC',
    author: { nickname: 'diegomartinez', name: 'Diego Martínez' },
    createdAt: '2025-09-10T14:00:00Z',
    updatedAt: '2025-09-20T16:00:00Z',
    problemJudgingUpdatedAt: '2025-09-20T16:00:00Z',
  },
  {
    slug: 'dynamic-knapsack',
    title: 'Dynamic Knapsack',
    statement: 'Dados $n$ objetos con pesos $w_i$ y valores $v_i$, y una mochila con capacidad $W$, determina el valor máximo que puedes llevar sin exceder la capacidad.\n\nLa relación de recurrencia es:\n\n$$dp[i][w] = \\max(dp[i-1][w], \\; dp[i-1][w - w_i] + v_i)$$',
    inputFormat: 'La primera línea contiene dos enteros $n$ y $W$ ($1 \\leq n \\leq 100$, $1 \\leq W \\leq 10^5$).\n\nLas siguientes $n$ líneas contienen dos enteros $w_i$ y $v_i$ ($1 \\leq w_i, v_i \\leq 10^3$), representando el peso y valor de cada objeto.',
    outputFormat: 'Imprime un entero: el valor máximo que se puede obtener.',
    examples: [
      { input: '3 50\n10 60\n20 100\n30 120', output: '220', explanation: 'Se toman los objetos 2 y 3 (peso total 50, valor 100+120=220).' },
      { input: '2 10\n5 10\n5 10', output: '20' },
    ],
    timeLimit: 2000,
    memoryLimit: 256,
    languageOverrides: [],
    tags: ['dp', 'knapsack'],
    status: 'PUBLISHED',
    accessibility: 'PUBLIC',
    author: { nickname: 'luisadmin', name: 'Luis Admin' },
    createdAt: '2025-10-01T10:00:00Z',
    updatedAt: '2025-10-15T12:00:00Z',
    problemJudgingUpdatedAt: '2025-10-15T12:00:00Z',
  },
  {
    slug: 'string-matching',
    title: 'String Matching (KMP)',
    statement: 'Implementa el algoritmo KMP de búsqueda de cadenas. Dado un texto $t$ y un patrón $p$, encuentra todas las posiciones donde $p$ ocurre en $t$.\n\nLa complejidad esperada es $O(|t| + |p|)$.\n\n### Restricciones\n\n- $1 \\leq |p| \\leq |t| \\leq 10^6$\n- Ambas cadenas contienen solo letras minúsculas del alfabeto inglés.',
    inputFormat: '```\nt\np\n```\n\nDonde $t$ es el texto y $p$ es el patrón a buscar.',
    outputFormat: '```\nk\ni_1 i_2 ... i_k\n```\n\nDonde $k$ es el número de ocurrencias y $i_1, i_2, \\ldots, i_k$ son las posiciones (0-indexed) donde comienza cada ocurrencia.',
    examples: [
      { input: 'abcabcabc\nabc', output: '3\n0 3 6' },
      { input: 'aaaaaa\naa', output: '5\n0 1 2 3 4' },
    ],
    timeLimit: 1500,
    memoryLimit: 256,
    languageOverrides: [],
    tags: ['strings', 'kmp'],
    status: 'PUBLISHED',
    accessibility: 'PRIVATE',
    author: { nickname: 'mariacoach', name: 'María Coach' },
    modifiers: [{ nickname: 'mariacoach', name: 'María Coach' }],
    files: { testCases: true, solutions: ['solution.cpp'], checker: false, validator: true },
    createdAt: '2025-11-01T08:00:00Z',
    updatedAt: '2025-11-10T10:00:00Z',
    problemJudgingUpdatedAt: '2025-11-10T10:00:00Z',
  },
  {
    slug: 'segment-tree-range',
    title: 'Segment Tree Range Query',
    statement: null,
    inputFormat: null,
    outputFormat: null,
    examples: [],
    timeLimit: 3000,
    memoryLimit: 512,
    languageOverrides: [],
    tags: ['data-structures', 'segment-tree'],
    status: 'DRAFT',
    accessibility: 'PRIVATE',
    author: { nickname: 'luisadmin', name: 'Luis Admin' },
    modifiers: [{ nickname: 'luisadmin', name: 'Luis Admin' }],
    files: { testCases: false, solutions: [], checker: false, validator: false },
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    problemJudgingUpdatedAt: null,
  },
  {
    slug: 'minimum-spanning-tree',
    title: 'Minimum Spanning Tree',
    statement: null,
    inputFormat: null,
    outputFormat: null,
    examples: [],
    timeLimit: null,
    memoryLimit: null,
    languageOverrides: [],
    tags: [],
    status: 'DRAFT',
    accessibility: 'PRIVATE',
    author: { nickname: 'mariacoach', name: 'María Coach' },
    modifiers: [{ nickname: 'mariacoach', name: 'María Coach' }],
    files: { testCases: false, solutions: [], checker: false, validator: false },
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
    problemJudgingUpdatedAt: null,
  },
]

export function toListItem(p: ProblemDetail): ProblemListItem {
  return {
    slug: p.slug,
    title: p.title,
    tags: p.tags,
    status: p.status,
    accessibility: p.accessibility,
    author: p.author,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export function buildProblemList(params: {
  page?: number
  limit?: number
  status?: string
  accessibility?: string
  tags?: string
  author?: string
  userNickname?: string
}) {
  let filtered = [...mockProblems]

  // Visibility: PUBLISHED for everyone, DRAFT only for modifiers/admin
  filtered = filtered.filter((p) => {
    if (p.status === 'PUBLISHED') return true
    if (params.userNickname === 'luisadmin') return true // admin sees all
    if (p.modifiers?.some((m) => m.nickname === params.userNickname)) return true
    return false
  })

  if (params.status) {
    filtered = filtered.filter((p) => p.status === params.status)
  }
  if (params.accessibility) {
    filtered = filtered.filter((p) => p.accessibility === params.accessibility)
  }
  if (params.tags) {
    const requiredTags = params.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    filtered = filtered.filter((p) =>
      requiredTags.every((t) => p.tags.some((tag) => tag.toLowerCase() === t)),
    )
  }
  if (params.author) {
    filtered = filtered.filter((p) => p.author.nickname === params.author)
  }

  // Sort by createdAt desc
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    problems: paged.map(toListItem),
    pagination: {
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      itemsPerPage: limit,
    },
  }
}

export const mockProblemStatistics: Record<string, ProblemStatistics> = {
  'two-sum': {
    totalSubmissions: 1250,
    uniqueUsers: { attempted: 234, solved: 89 },
    acceptanceRateByLanguage: [
      { language: 'java17', usersAccepted: 35, usersAttempted: 50 },
      { language: 'cpp20', usersAccepted: 30, usersAttempted: 110 },
      { language: 'python310', usersAccepted: 24, usersAttempted: 74 },
    ],
    verdictDistribution: [
      { verdict: 'ACCEPTED', count: 450 },
      { verdict: 'WRONG_ANSWER', count: 520 },
      { verdict: 'TIME_LIMIT_EXCEEDED', count: 180 },
      { verdict: 'COMPILATION_ERROR', count: 65 },
      { verdict: 'RUNTIME_EXCEPTION', count: 35 },
    ],
  },
  'binary-search': {
    totalSubmissions: 890,
    uniqueUsers: { attempted: 180, solved: 120 },
    acceptanceRateByLanguage: [
      { language: 'cpp20', usersAccepted: 70, usersAttempted: 90 },
      { language: 'python310', usersAccepted: 35, usersAttempted: 60 },
      { language: 'java17', usersAccepted: 15, usersAttempted: 30 },
    ],
    verdictDistribution: [
      { verdict: 'ACCEPTED', count: 600 },
      { verdict: 'WRONG_ANSWER', count: 200 },
      { verdict: 'RUNTIME_EXCEPTION', count: 50 },
      { verdict: 'TIME_LIMIT_EXCEEDED', count: 40 },
    ],
  },
}

// === Mock Submissions ===

import type { SubmissionListItem, SubmissionDetail } from '@/types/submission'

export const mockSubmissions: SubmissionDetail[] = [
  {
    id: 'sub-001-aaaa-bbbb-cccc-ddddeeee0001',
    status: 'ACCEPTED',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-14T18:30:00Z',
    judgedAt: '2026-03-14T18:30:05Z',
    problem: { slug: 'two-sum', title: 'Two Sum' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'cpp20',
    compiler: 'g++',
    executionTime: 45,
    memoryUsed: 12,
    sourceCode: '#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    int n, target;\n    cin >> n >> target;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n\n    unordered_map<int, int> seen;\n    for (int i = 0; i < n; i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) {\n            cout << seen[complement] << " " << i << endl;\n            return 0;\n        }\n        seen[nums[i]] = i;\n    }\n    return 0;\n}',
  },
  {
    id: 'sub-002-aaaa-bbbb-cccc-ddddeeee0002',
    status: 'WRONG_ANSWER',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-13T15:20:00Z',
    judgedAt: '2026-03-13T15:20:08Z',
    problem: { slug: 'binary-search', title: 'Binary Search' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'python310',
    compiler: 'pypy3',
    executionTime: 120,
    memoryUsed: 24,
    sourceCode: 'def binary_search(arr, target):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return -1\n\nn, t = map(int, input().split())\narr = list(map(int, input().split()))\nprint(binary_search(arr, t))',
  },
  {
    id: 'sub-003-aaaa-bbbb-cccc-ddddeeee0003',
    status: 'TIME_LIMIT_EXCEEDED',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-12T10:45:00Z',
    judgedAt: '2026-03-12T10:45:12Z',
    problem: { slug: 'merge-sort', title: 'Merge Sort' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'java17',
    compiler: 'javac',
    executionTime: 3000,
    memoryUsed: 128,
    sourceCode: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] arr = new int[n];\n        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();\n        mergeSort(arr, 0, n - 1);\n        for (int x : arr) System.out.print(x + " ");\n    }\n\n    static void mergeSort(int[] a, int l, int r) {\n        if (l >= r) return;\n        int m = (l + r) / 2;\n        mergeSort(a, l, m);\n        mergeSort(a, m + 1, r);\n        merge(a, l, m, r);\n    }\n\n    static void merge(int[] a, int l, int m, int r) {\n        int[] tmp = Arrays.copyOfRange(a, l, r + 1);\n        int i = 0, j = m - l + 1, k = l;\n        while (i <= m - l && j <= r - l) {\n            a[k++] = tmp[i] <= tmp[j] ? tmp[i++] : tmp[j++];\n        }\n        while (i <= m - l) a[k++] = tmp[i++];\n        while (j <= r - l) a[k++] = tmp[j++];\n    }\n}',
  },
  {
    id: 'sub-004-aaaa-bbbb-cccc-ddddeeee0004',
    status: 'ACCEPTED',
    visibility: 'PUBLIC',
    submittedAt: '2026-03-11T20:00:00Z',
    judgedAt: '2026-03-11T20:00:03Z',
    problem: { slug: 'graph-bfs', title: 'Graph BFS' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'cpp20',
    compiler: 'g++',
    executionTime: 30,
    memoryUsed: 8,
    sourceCode: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n, m, s;\n    cin >> n >> m >> s;\n    vector<vector<int>> adj(n + 1);\n    for (int i = 0; i < m; i++) {\n        int u, v;\n        cin >> u >> v;\n        adj[u].push_back(v);\n        adj[v].push_back(u);\n    }\n    vector<int> dist(n + 1, -1);\n    queue<int> q;\n    dist[s] = 0;\n    q.push(s);\n    while (!q.empty()) {\n        int u = q.front(); q.pop();\n        for (int v : adj[u]) {\n            if (dist[v] == -1) {\n                dist[v] = dist[u] + 1;\n                q.push(v);\n            }\n        }\n    }\n    for (int i = 1; i <= n; i++) cout << dist[i] << " ";\n}',
  },
  {
    id: 'sub-005-aaaa-bbbb-cccc-ddddeeee0005',
    status: 'COMPILATION_ERROR',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-10T09:15:00Z',
    judgedAt: '2026-03-10T09:15:01Z',
    problem: { slug: 'dynamic-knapsack', title: 'Dynamic Knapsack' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'cpp20',
    compiler: 'g++',
    executionTime: null,
    memoryUsed: null,
    sourceCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n, W;\n    cin >> n >> W;\n    // missing closing brace\n    int dp[n+1][W+1];\n    for (int i = 0; i <= n; i++)\n        for (int w = 0; w <= W; w++)\n            dp[i][w] = 0;\n',
  },
  {
    id: 'sub-006-aaaa-bbbb-cccc-ddddeeee0006',
    status: 'ACCEPTED',
    visibility: 'PUBLIC',
    submittedAt: '2026-03-09T14:00:00Z',
    judgedAt: '2026-03-09T14:00:04Z',
    problem: { slug: 'two-sum', title: 'Two Sum' },
    contest: null,
    submittedBy: { id: 'u3', nickname: 'carloscp' },
    language: 'python310',
    compiler: 'pypy3',
    executionTime: 200,
    memoryUsed: 32,
    sourceCode: 'n, target = map(int, input().split())\nnums = list(map(int, input().split()))\nseen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:\n        print(seen[target - x], i)\n        break\n    seen[x] = i',
  },
  {
    id: 'sub-007-aaaa-bbbb-cccc-ddddeeee0007',
    status: 'RUNTIME_EXCEPTION',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-08T11:30:00Z',
    judgedAt: '2026-03-08T11:30:02Z',
    problem: { slug: 'binary-search', title: 'Binary Search' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'cpp20',
    compiler: 'g++',
    executionTime: 5,
    memoryUsed: 4,
    sourceCode: '#include <iostream>\nusing namespace std;\nint main() {\n    int n, t;\n    cin >> n >> t;\n    int a[n];\n    for (int i = 0; i < n; i++) cin >> a[i];\n    // bug: accessing out of bounds\n    cout << a[n] << endl;\n    return 0;\n}',
  },
  {
    id: 'sub-008-aaaa-bbbb-cccc-ddddeeee0008',
    status: 'PENDING',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-15T08:00:00Z',
    judgedAt: null,
    problem: { slug: 'dynamic-knapsack', title: 'Dynamic Knapsack' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'cpp20',
    compiler: 'g++',
    executionTime: null,
    memoryUsed: null,
    sourceCode: '#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n, W;\n    cin >> n >> W;\n    vector<int> w(n), v(n);\n    for (int i = 0; i < n; i++) cin >> w[i] >> v[i];\n    vector<long long> dp(W + 1, 0);\n    for (int i = 0; i < n; i++)\n        for (int j = W; j >= w[i]; j--)\n            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);\n    cout << dp[W] << endl;\n}',
  },
  {
    id: 'sub-009-aaaa-bbbb-cccc-ddddeeee0009',
    status: 'WRONG_ANSWER',
    visibility: 'PRIVATE',
    submittedAt: '2026-03-15T10:00:00Z',
    judgedAt: '2026-03-15T10:00:04Z',
    problem: { slug: 'two-sum', title: 'Two Sum' },
    contest: null,
    submittedBy: { id: 'u1', nickname: 'luisadmin' },
    language: 'blockly',
    compiler: 'pypy3',
    executionTime: 200,
    memoryUsed: 16,
    sourceCode: 'n = int(input())\ntarget = int(input())\nnums = []\nfor i in range(n):\n  nums.append(int(input()))\nfor i in range(n):\n  for j in range(i + 1, n):\n    if nums[i] + nums[j] == target:\n      print(i, j)',
    blocksSvgUrl: '/mock-blocks.svg',
    isBlocklySubmission: true,
    workspaceXml: '<xml xmlns="https://developers.google.com/blockly/xml"><variables><variable id="v1">n</variable><variable id="v2">target</variable><variable id="v3">nums</variable></variables><block type="variables_set" x="20" y="20"><field name="VAR" id="v1">n</field><value name="VALUE"><block type="text_prompt_ext"><mutation type="NUMBER"></mutation><field name="TYPE">NUMBER</field><value name="TEXT"><shadow type="text"><field name="TEXT"></field></shadow></value></block></value><next><block type="variables_set"><field name="VAR" id="v2">target</field><value name="VALUE"><block type="text_prompt_ext"><mutation type="NUMBER"></mutation><field name="TYPE">NUMBER</field><value name="TEXT"><shadow type="text"><field name="TEXT"></field></shadow></value></block></value><next><block type="text_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Hola mundo</field></shadow></value></block></next></block></next></block></xml>',
  },
]

export function toSubmissionListItem(s: SubmissionDetail): SubmissionListItem {
  return {
    id: s.id,
    status: s.status,
    visibility: s.visibility,
    submittedAt: s.submittedAt,
    problem: s.problem,
    contest: s.contest,
    submittedBy: s.submittedBy,
    language: s.language,
    executionTime: s.executionTime,
    memoryUsed: s.memoryUsed,
  }
}

export function buildMySubmissionsList(params: {
  page?: number
  limit?: number
  verdict?: string
  problemSlug?: string
  language?: string
  userNickname: string
}) {
  let filtered = mockSubmissions.filter((s) => s.submittedBy.nickname === params.userNickname)

  if (params.verdict) {
    filtered = filtered.filter((s) => s.status === params.verdict)
  }
  if (params.problemSlug) {
    filtered = filtered.filter((s) => s.problem.slug.includes(params.problemSlug!))
  }
  if (params.language) {
    filtered = filtered.filter((s) => s.language === params.language)
  }

  filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    submissions: paged.map(toSubmissionListItem),
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

export function buildProblemSubmissionsList(params: {
  problemSlug: string
  page?: number
  limit?: number
  verdict?: string
  language?: string
  mine?: boolean
  userNickname?: string
}) {
  let filtered = mockSubmissions.filter((s) => s.problem.slug === params.problemSlug)

  if (params.mine && params.userNickname) {
    filtered = filtered.filter((s) => s.submittedBy.nickname === params.userNickname)
  }
  if (params.verdict) {
    filtered = filtered.filter((s) => s.status === params.verdict)
  }
  if (params.language) {
    filtered = filtered.filter((s) => s.language === params.language)
  }

  filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    submissions: paged.map(toSubmissionListItem),
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

// === Mock Contests ===

import type {
  ContestDetail,
  ContestListItem,
  StandingEntry,
  ContestSubmissionItem,
} from '@/types/contest'

// Helper to compute contest status
function computeContestStatus(startTime: string, endTime: string): 'SCHEDULED' | 'ACTIVE' | 'FINISHED' {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (now < start) return 'SCHEDULED'
  if (now <= end) return 'ACTIVE'
  return 'FINISHED'
}

const now = new Date()
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
const inTwoDaysEnd = new Date(inTwoDays.getTime() + 5 * 60 * 60 * 1000)
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const yesterdayEnd = new Date(yesterday.getTime() + 3 * 60 * 60 * 1000)
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
const inFourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000)

export const mockContests: ContestDetail[] = [
  {
    id: 'contest-1',
    name: 'Contest Semanal #12',
    description: 'Contest de práctica semanal enfocado en programación dinámica y grafos.',
    startTime: inTwoDays.toISOString(),
    endTime: inTwoDaysEnd.toISOString(),
    duration: 18000,
    status: 'SCHEDULED',
    penalty: 20,
    freezeMinutes: 60,
    enablePostContest: false,
    locked: false,
    participantCount: 25,
    isRegistered: false,
    participationMode: 'MIXED',
    teamSizeMin: 2,
    teamSizeMax: 3,
    showTeamMembers: true,
    group: { id: 'group-1', name: 'ICPC Colombia' },
    owner: { id: 'u2', nickname: 'mariacoach' },
    problems: [],
    problemCount: 0,
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'contest-2',
    name: 'Práctica Grafos',
    description: 'Problemas de grafos: BFS, DFS, Dijkstra, MST.',
    startTime: oneHourAgo.toISOString(),
    endTime: inFourHours.toISOString(),
    duration: 18000,
    status: 'ACTIVE',
    penalty: 20,
    freezeMinutes: 60,
    enablePostContest: true,
    locked: false,
    participantCount: 18,
    isRegistered: true,
    participationMode: 'INDIVIDUAL',
    showTeamMembers: false,
    group: { id: 'group-1', name: 'ICPC Colombia' },
    owner: { id: 'u1', nickname: 'luisadmin' },
    problems: [
      { position: 1, slug: 'two-sum', title: 'Two Sum', timeLimit: 2000, memoryLimit: 256 },
      { position: 2, slug: 'binary-search', title: 'Binary Search', timeLimit: 1000, memoryLimit: 128 },
      { position: 3, slug: 'graph-bfs', title: 'Graph BFS', timeLimit: 2000, memoryLimit: 256 },
    ],
    problemCount: 3,
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-18T12:00:00Z',
  },
  {
    id: 'contest-3',
    name: 'Challenge Algoritmos Clásicos',
    description: 'Competencia de algoritmos clásicos: sorting, búsqueda, DP.',
    startTime: yesterday.toISOString(),
    endTime: yesterdayEnd.toISOString(),
    duration: 10800,
    status: 'FINISHED',
    penalty: 20,
    freezeMinutes: null,
    enablePostContest: false,
    locked: true,
    participantCount: 42,
    isRegistered: true,
    participationMode: 'INDIVIDUAL',
    showTeamMembers: false,
    group: { id: 'group-1', name: 'ICPC Colombia' },
    owner: { id: 'u2', nickname: 'mariacoach' },
    problems: [
      { position: 1, slug: 'two-sum', title: 'Two Sum', timeLimit: 2000, memoryLimit: 256 },
      { position: 2, slug: 'binary-search', title: 'Binary Search', timeLimit: 1000, memoryLimit: 128 },
      { position: 3, slug: 'dynamic-knapsack', title: 'Dynamic Knapsack', timeLimit: 2000, memoryLimit: 256 },
      { position: 4, slug: 'graph-bfs', title: 'Graph BFS', timeLimit: 2000, memoryLimit: 256 },
    ],
    problemCount: 4,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-19T20:00:00Z',
  },
  {
    id: 'contest-4',
    name: 'Mini Contest DP',
    description: null,
    startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    duration: 10800,
    status: 'SCHEDULED',
    penalty: 30,
    freezeMinutes: 30,
    enablePostContest: true,
    locked: false,
    participantCount: 5,
    isRegistered: false,
    participationMode: 'TEAM',
    teamSizeMin: 2,
    teamSizeMax: 4,
    showTeamMembers: true,
    group: { id: 'group-2', name: 'Entrenamiento Avanzado' },
    owner: { id: 'u7', nickname: 'diegomartinez' },
    problems: [],
    problemCount: 0,
    createdAt: '2026-03-18T14:00:00Z',
    updatedAt: '2026-03-18T14:00:00Z',
  },
]

export function toContestListItem(c: ContestDetail): ContestListItem {
  return {
    id: c.id,
    name: c.name,
    description: c.description ? c.description.slice(0, 200) : null,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration,
    status: computeContestStatus(c.startTime, c.endTime),
    penalty: c.penalty,
    freezeMinutes: c.freezeMinutes,
    enablePostContest: c.enablePostContest,
    participantCount: c.participantCount,
    isRegistered: c.isRegistered,
    problemCount: c.problems.length,
    group: c.group,
  }
}

export function buildContestList(params: {
  groupId: string
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: string
}) {
  let filtered = mockContests.filter((c) => c.group.id === params.groupId)

  // Recompute status
  filtered = filtered.map((c) => ({
    ...c,
    status: computeContestStatus(c.startTime, c.endTime),
  }))

  if (params.status) {
    filtered = filtered.filter((c) => c.status === params.status)
  }

  const sortBy = params.sortBy || 'startTime'
  const sortOrder = params.sortOrder || 'desc'
  filtered.sort((a, b) => {
    const aVal = sortBy === 'name' ? a.name : a[sortBy as keyof typeof a] as string
    const bVal = sortBy === 'name' ? b.name : b[sortBy as keyof typeof b] as string
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortOrder === 'desc' ? -cmp : cmp
  })

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    data: paged.map(toContestListItem),
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

// === Mock Standings ===

export const mockStandings: StandingEntry[] = [
  {
    rank: 1,
    participant: {
      id: 'team-1',
      type: 'TEAM',
      displayName: 'Competitive Coders',
      members: ['luisadmin', 'carloscp', 'anagarcia'],
    },
    problemsSolved: 3,
    totalPenalty: 110,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 20, penalty: 0 },
      { position: 2, status: 'ACCEPTED', attempts: 1, time: 45, penalty: 0 },
      { position: 3, status: 'ACCEPTED', attempts: 2, time: 75, penalty: 20 },
    ],
  },
  {
    rank: 2,
    participant: {
      id: 'u3',
      type: 'INDIVIDUAL',
      displayName: 'carloscp',
      nickname: 'carloscp',
      country: 'Argentina',
      city: 'Buenos Aires',
      institution: 'UBA',
    },
    problemsSolved: 3,
    totalPenalty: 125,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 30, penalty: 0 },
      { position: 2, status: 'ACCEPTED', attempts: 2, time: 55, penalty: 20 },
      { position: 3, status: 'ACCEPTED', attempts: 1, time: 80, penalty: 0 },
    ],
  },
  {
    rank: 3,
    participant: {
      id: 'u4',
      type: 'INDIVIDUAL',
      displayName: 'anagarcia',
      nickname: 'anagarcia',
      country: 'Chile',
      city: 'Santiago',
      institution: 'Universidad de Chile',
    },
    problemsSolved: 2,
    totalPenalty: 90,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 25, penalty: 0 },
      { position: 2, status: 'WRONG_ANSWER', attempts: 4, time: null, penalty: 0 },
      { position: 3, status: 'ACCEPTED', attempts: 3, time: 65, penalty: 40 },
    ],
  },
  {
    rank: 4,
    participant: {
      id: 'team-2',
      type: 'TEAM',
      displayName: 'Algorithm Masters',
      members: ['pedromartinez', 'sofiarodriguez'],
    },
    problemsSolved: 2,
    totalPenalty: 95,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 1, time: 35, penalty: 0 },
      { position: 2, status: 'ACCEPTED', attempts: 3, time: 60, penalty: 40 },
      { position: 3, status: 'WRONG_ANSWER', attempts: 1, time: null, penalty: 0 },
    ],
  },
  {
    rank: 5,
    participant: {
      id: 'u6',
      type: 'INDIVIDUAL',
      displayName: 'sofiarodriguez',
      nickname: 'sofiarodriguez',
      country: 'Colombia',
      city: 'Medellín',
      institution: 'EAFIT',
    },
    problemsSolved: 1,
    totalPenalty: 45,
    problems: [
      { position: 1, status: 'ACCEPTED', attempts: 2, time: 45, penalty: 20 },
      { position: 2, status: 'NOT_ATTEMPTED', attempts: 0, time: null, penalty: 0 },
      { position: 3, status: 'WRONG_ANSWER', attempts: 2, time: null, penalty: 0 },
    ],
  },
]

// === Mock Contest Submissions ===

export const mockContestSubmissions: ContestSubmissionItem[] = [
  {
    id: 'csub-001',
    problem: { slug: 'two-sum', title: 'Two Sum', order: 1 },
    submittedBy: { type: 'INDIVIDUAL', nickname: 'carloscp', name: 'Carlos Pérez' },
    language: 'cpp20',
    submittedAt: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString(),
    status: 'ACCEPTED',
  },
  {
    id: 'csub-002',
    problem: { slug: 'binary-search', title: 'Binary Search', order: 2 },
    submittedBy: { type: 'TEAM', teamId: 'team-1', teamName: 'Competitive Coders', members: ['luisadmin', 'carloscp', 'anagarcia'] },
    language: 'cpp20',
    submittedAt: new Date(oneHourAgo.getTime() + 20 * 60 * 1000).toISOString(),
    status: 'ACCEPTED',
  },
  {
    id: 'csub-003',
    problem: { slug: 'binary-search', title: 'Binary Search', order: 2 },
    submittedBy: { type: 'INDIVIDUAL', nickname: 'anagarcia', name: 'Ana García' },
    language: 'python310',
    submittedAt: new Date(oneHourAgo.getTime() + 25 * 60 * 1000).toISOString(),
    status: 'WRONG_ANSWER',
  },
  {
    id: 'csub-004',
    problem: { slug: 'graph-bfs', title: 'Graph BFS', order: 3 },
    submittedBy: { type: 'INDIVIDUAL', nickname: 'sofiarodriguez', name: 'Sofía Rodríguez' },
    language: 'java17',
    submittedAt: new Date(oneHourAgo.getTime() + 45 * 60 * 1000).toISOString(),
    status: 'ACCEPTED',
  },
  {
    id: 'csub-005',
    problem: { slug: 'two-sum', title: 'Two Sum', order: 1 },
    submittedBy: { type: 'TEAM', teamId: 'team-2', teamName: 'Algorithm Masters', members: ['pedromartinez', 'sofiarodriguez'] },
    language: 'java17',
    submittedAt: new Date(oneHourAgo.getTime() + 35 * 60 * 1000).toISOString(),
    status: 'ACCEPTED',
  },
  {
    id: 'csub-006',
    problem: { slug: 'two-sum', title: 'Two Sum', order: 1 },
    submittedBy: { type: 'INDIVIDUAL', nickname: 'anagarcia', name: 'Ana García' },
    language: 'python310',
    submittedAt: new Date(oneHourAgo.getTime() + 20 * 60 * 1000).toISOString(),
    status: 'ACCEPTED',
  },
]

// === Mock Materials ===

import type { Material, MaterialListResponse } from '@/types/material'

export const mockMaterials: Material[] = [
  {
    id: 'mat-001',
    title: 'Bienvenidos al grupo de entrenamiento',
    content: '# Bienvenidos\n\nEste es el grupo oficial de entrenamiento para la competencia regional.\n\n## Reglas\n\n1. Respetar los horarios de práctica\n2. Completar los problemas asignados\n3. Participar en los contests semanales\n\n## Recursos útiles\n\n- [Competitive Programming Handbook](https://cses.fi/book/book.pdf)\n- [CP Algorithms](https://cp-algorithms.com/)\n\n## Video introductorio\n\n[Ver video de bienvenida](https://youtube.com/watch?v=dQw4w9WgXcQ)',
    tags: ['announcement', 'welcome'],
    status: 'PUBLISHED',
    pinned: true,
    pinnedAt: '2026-02-10T10:00:00Z',
    author: { nickname: 'mariacoach', name: 'María Coach' },
    group: { id: 'group-1', name: 'ICPC Colombia' },
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
    publishedAt: '2026-02-01T12:00:00Z',
  },
  {
    id: 'mat-002',
    title: 'Semana 1: Introducción a Grafos',
    content: '# Grafos - Semana 1\n\nEsta semana cubriremos los fundamentos de grafos.\n\n## Temas\n\n- Representación de grafos (lista de adyacencia, matriz)\n- BFS y DFS\n- Componentes conexas\n\n## Código de ejemplo\n\n```cpp\n#include <bits/stdc++.h>\nusing namespace std;\n\nvoid bfs(int start, vector<vector<int>>& adj) {\n    queue<int> q;\n    vector<bool> visited(adj.size(), false);\n    q.push(start);\n    visited[start] = true;\n    while (!q.empty()) {\n        int u = q.front(); q.pop();\n        for (int v : adj[u]) {\n            if (!visited[v]) {\n                visited[v] = true;\n                q.push(v);\n            }\n        }\n    }\n}\n```\n\n## Problemas recomendados\n\n| Problema | Dificultad | Tema |\n|----------|-----------|------|\n| Graph BFS | Fácil | BFS |\n| Connected Components | Medio | DFS |\n| Shortest Path | Medio | BFS |',
    tags: ['algorithms', 'data-structures', 'week1'],
    status: 'PUBLISHED',
    pinned: false,
    pinnedAt: null,
    author: { nickname: 'mariacoach', name: 'María Coach' },
    group: { id: 'group-1', name: 'ICPC Colombia' },
    createdAt: '2026-02-05T14:00:00Z',
    updatedAt: '2026-02-05T14:00:00Z',
    publishedAt: '2026-02-05T14:30:00Z',
  },
  {
    id: 'mat-003',
    title: 'Guía Completa: Programación Dinámica',
    content: `# Programación Dinámica

La **programación dinámica** (DP) es una de las técnicas más poderosas en programación competitiva. Si dominas DP, puedes resolver ~30% de los problemas de un contest típico de ICPC.

> "Those who cannot remember the past are condemned to repeat it." — Esta frase resume perfectamente la idea detrás de DP: **recordar resultados previos** para no recalcularlos.

---

## Conceptos Fundamentales

Antes de ver código, asegúrate de entender estos dos pilares:

1. **Subestructura óptima**: la solución óptima del problema se construye a partir de soluciones óptimas de subproblemas.
2. **Superposición de subproblemas**: los mismos subproblemas se resuelven múltiples veces.

Si un problema tiene ambas propiedades, DP es probablemente el approach correcto.

### Memoización vs Tabulación

| Aspecto | Memoización (Top-Down) | Tabulación (Bottom-Up) |
|---------|----------------------|----------------------|
| Dirección | Del problema grande al pequeño | Del caso base al problema |
| Implementación | Recursión + cache | Loops iterativos |
| Stack overflow | Posible en problemas grandes | No aplica |
| Subproblemas visitados | Solo los necesarios | Todos |
| Facilidad | Más intuitiva | Más eficiente |

---

## Ejemplo 1: Fibonacci

El ejemplo clásico para entender la diferencia:

### Top-Down (Memoización)

\`\`\`python
def fib(n, memo={}):
    if n <= 1:
        return n
    if n not in memo:
        memo[n] = fib(n - 1) + fib(n - 2)
    return memo[n]

# Complejidad: O(n) tiempo, O(n) espacio
print(fib(50))  # 12586269025
\`\`\`

### Bottom-Up (Tabulación)

\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    
    vector<long long> dp(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    cout << dp[n] << endl;
    return 0;
}
\`\`\`

> **Tip**: En contests, bottom-up suele ser más seguro porque evita stack overflow. Usa memoización cuando la recurrencia es compleja y no todos los estados se visitan.

---

## Ejemplo 2: Knapsack 0/1

El problema clásico de la mochila. Dados \`n\` objetos con peso \`w[i]\` y valor \`v[i]\`, maximizar el valor total sin exceder capacidad \`W\`.

### Recurrencia

La decisión para cada objeto es binaria: **tomarlo o dejarlo**.

\`\`\`
dp[i][w] = max(
    dp[i-1][w],              // no tomar objeto i
    dp[i-1][w - w[i]] + v[i] // tomar objeto i (si w >= w[i])
)
\`\`\`

### Implementación optimizada (1D)

\`\`\`java
import java.util.*;

public class Knapsack {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), W = sc.nextInt();
        int[] w = new int[n], v = new int[n];
        
        for (int i = 0; i < n; i++) {
            w[i] = sc.nextInt();
            v[i] = sc.nextInt();
        }
        
        // Truco: iterar W de derecha a izquierda
        // para simular dp[i-1][...] con un solo array
        int[] dp = new int[W + 1];
        for (int i = 0; i < n; i++) {
            for (int j = W; j >= w[i]; j--) {
                dp[j] = Math.max(dp[j], dp[j - w[i]] + v[i]);
            }
        }
        
        System.out.println(dp[W]);
    }
}
\`\`\`

---

## Problemas Recomendados

Practica estos problemas en orden de dificultad:

| # | Problema | Dificultad | Tema | Link |
|---|----------|-----------|------|------|
| 1 | Fibonacci | Fácil | DP lineal | [Resolver](https://cses.fi/problemset/task/1746) |
| 2 | Coin Change | Fácil | DP sobre conjuntos | [Resolver](https://cses.fi/problemset/task/1634) |
| 3 | 0/1 Knapsack | Medio | DP clásico | [Resolver](https://cses.fi/problemset/task/1158) |
| 4 | LIS | Medio | DP + Binary Search | [Resolver](https://cses.fi/problemset/task/1145) |
| 5 | Edit Distance | Medio | DP 2D | [Resolver](https://cses.fi/problemset/task/1639) |
| 6 | Counting Towers | Difícil | DP combinatorio | [Resolver](https://cses.fi/problemset/task/2413) |

### Checklist de práctica

- [ ] Resuelve al menos 3 problemas esta semana
- [ ] Intenta cada problema **sin ver la solución** por al menos 30 minutos
- [ ] Si te atascas, dibuja la tabla de DP en papel
- [ ] Después de resolver, optimiza el espacio si es posible

---

## Recursos Adicionales

- [CP Algorithms — Dynamic Programming](https://cp-algorithms.com/)
- [CSES Problem Set — DP Section](https://cses.fi/problemset/)
- [Competitive Programming Handbook, Cap. 7](https://cses.fi/book/book.pdf)

**La próxima semana** veremos DP sobre árboles y DP con bitmask. ¡Prepárense!

---

## Apéndice: Análisis de Complejidad

La complejidad del Knapsack 0/1 se puede expresar formalmente:

$$T(n, W) = O(n \\cdot W)$$

Donde $n$ es el número de objetos y $W$ la capacidad máxima. Esto es **pseudo-polinomial** porque $W$ no es polinomial en el tamaño de la entrada (número de bits).

Para Fibonacci con memoización, la recurrencia satisface:

$$F(n) = F(n-1) + F(n-2), \\quad F(0) = 0, \\quad F(1) = 1$$

Y la forma cerrada (fórmula de Binet) es:

$$F(n) = \\frac{\\phi^n - \\psi^n}{\\sqrt{5}}, \\quad \\text{donde } \\phi = \\frac{1 + \\sqrt{5}}{2}$$

> **Nota**: En competencia, rara vez necesitas la forma cerrada. Pero entender que $F(n) \\in O(\\phi^n)$ te ayuda a estimar si una solución recursiva sin memo es viable.`,
    tags: ['algorithms', 'dp', 'competitive-programming', 'tutorial', 'resources'],
    status: 'PUBLISHED',
    pinned: false,
    pinnedAt: null,
    author: { nickname: 'luisadmin', name: 'Luis Admin' },
    group: { id: 'group-1', name: 'ICPC Colombia' },
    createdAt: '2026-02-12T09:00:00Z',
    updatedAt: '2026-02-12T09:00:00Z',
    publishedAt: '2026-02-12T10:00:00Z',
  },
  {
    id: 'mat-004',
    title: 'Borrador: Semana 3 - Segment Trees',
    content: '# Segment Trees\n\nTODO: completar contenido sobre segment trees y lazy propagation.',
    tags: ['algorithms'],
    status: 'DRAFT',
    pinned: false,
    pinnedAt: null,
    author: { nickname: 'mariacoach', name: 'María Coach' },
    group: { id: 'group-1', name: 'ICPC Colombia' },
    createdAt: '2026-02-18T16:00:00Z',
    updatedAt: '2026-02-18T16:00:00Z',
    publishedAt: null,
  },
  {
    id: 'mat-005',
    title: 'Anuncio: Contest Regional',
    content: '# Contest Regional 2026\n\nSe acerca el contest regional. Fechas importantes:\n\n- **Inscripción**: 1 de marzo\n- **Contest**: 15 de marzo\n- **Lugar**: Virtual\n\nPrepárense practicando los problemas de las semanas anteriores.',
    tags: ['announcement'],
    status: 'PUBLISHED',
    pinned: true,
    pinnedAt: '2026-02-20T08:00:00Z',
    author: { nickname: 'luisadmin', name: 'Luis Admin' },
    group: { id: 'group-1', name: 'ICPC Colombia' },
    createdAt: '2026-02-19T11:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
    publishedAt: '2026-02-19T12:00:00Z',
  },
]

export function buildMaterialList(params: {
  groupId: string
  page?: number
  limit?: number
  pinned?: string
  tags?: string
  q?: string
}): MaterialListResponse {
  let filtered = mockMaterials.filter((m) => m.group.id === params.groupId)

  if (params.pinned === 'true') filtered = filtered.filter((m) => m.pinned)
  if (params.pinned === 'false') filtered = filtered.filter((m) => !m.pinned)

  if (params.tags) {
    const requiredTags = params.tags.split(',')
    filtered = filtered.filter((m) => requiredTags.every((t) => m.tags.includes(t)))
  }

  if (params.q) {
    const q = params.q.toLowerCase()
    filtered = filtered.filter(
      (m) => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q),
    )
  }

  // Sort: pinned first by pinnedAt DESC, then by publishedAt DESC
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.pinned && b.pinned) {
      return new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime()
    }
    const aDate = a.publishedAt ?? a.createdAt
    const bDate = b.publishedAt ?? b.createdAt
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  const page = params.page || 1
  const limit = params.limit || 20
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return {
    materials: paged,
    pagination: {
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      itemsPerPage: limit,
    },
  }
}

// === Teams ===

import type { MyTeamItem, TeamDetail, TeamInvitationItem } from '@/types/team'

export const mockMyTeams: MyTeamItem[] = [
  {
    id: 'team-1',
    name: 'Competitive Coders',
    memberCount: 3,
    joinedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'team-2',
    name: 'Algorithm Masters',
    memberCount: 4,
    joinedAt: '2026-02-01T14:00:00Z',
    createdAt: '2026-01-20T12:00:00Z',
  },
]

export const mockTeamDetails: Record<string, TeamDetail> = {
  'team-1': {
    id: 'team-1',
    name: 'Competitive Coders',
    createdBy: { id: 'u1', nickname: 'luisadmin' },
    createdAt: '2026-01-10T08:00:00Z',
    members: [
      { id: 'u1', nickname: 'luisadmin', joinedAt: '2026-01-10T08:00:00Z' },
      { id: 'u3', nickname: 'carloscp', joinedAt: '2026-01-15T10:00:00Z' },
      { id: 'u4', nickname: 'anagarcia', joinedAt: '2026-01-20T14:00:00Z' },
    ],
    pendingInvitations: [
      {
        id: 'tinv-1',
        invitee: { id: 'u6', nickname: 'sofiarodriguez' },
        invitedBy: { id: 'u1', nickname: 'luisadmin' },
        invitedAt: '2026-03-10T10:00:00Z',
      },
    ],
  },
  'team-2': {
    id: 'team-2',
    name: 'Algorithm Masters',
    createdBy: { id: 'u3', nickname: 'carloscp' },
    createdAt: '2026-01-20T12:00:00Z',
    members: [
      { id: 'u3', nickname: 'carloscp', joinedAt: '2026-01-20T12:00:00Z' },
      { id: 'u1', nickname: 'luisadmin', joinedAt: '2026-02-01T14:00:00Z' },
      { id: 'u4', nickname: 'anagarcia', joinedAt: '2026-02-05T09:00:00Z' },
      { id: 'u5', nickname: 'pedromartinez', joinedAt: '2026-02-10T11:00:00Z' },
    ],
    pendingInvitations: [],
  },
}

export const mockTeamInvitations: TeamInvitationItem[] = [
  {
    id: 'tinv-recv-1',
    team: { id: 'team-3', name: 'Code Warriors' },
    invitedBy: { id: 'u5', nickname: 'pedromartinez' },
    invitedAt: '2026-03-18T10:00:00Z',
    expiresAt: null,
  },
]
