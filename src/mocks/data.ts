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
    statement: 'Given an array of integers $nums$ and an integer $target$, return indices of the two numbers such that they add up to $target$.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n$$nums[i] + nums[j] = target \\quad (i \\neq j)$$\n\nConstraints:\n- $2 \\leq nums.length \\leq 10^4$\n- $-10^9 \\leq nums[i] \\leq 10^9$\n- $-10^9 \\leq target \\leq 10^9$',
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
    statement: 'Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return -1.',
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
    statement: 'Implement the merge sort algorithm. Given an array of integers, sort them in non-decreasing order.',
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
    statement: 'Given an unweighted graph and a source vertex, find the shortest path from the source to all other vertices using BFS.',
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
    statement: 'Given weights and values of $n$ items, put these items in a knapsack of capacity $W$ to get the maximum total value.\n\nThe recurrence relation is:\n\n$$dp[i][w] = \\max(dp[i-1][w], \\; dp[i-1][w - w_i] + v_i)$$\n\nConstraints:\n- $1 \\leq n \\leq 1000$\n- $1 \\leq W \\leq 10^6$\n- $1 \\leq w_i, v_i \\leq 10^9$',
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
    statement: 'Implement the KMP string matching algorithm. Given a text and a pattern, find all occurrences of the pattern in the text.',
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
