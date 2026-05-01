import { isModuleMocked } from './utils'
import { authHandlers } from './auth'
import { usersHandlers } from './users'
import { dashboardHandlers } from './dashboard'
import { groupsHandlers } from './groups'
import { problemsHandlers } from './problems'
import { submissionsHandlers } from './submissions'
import { contestsHandlers } from './contests'
import { materialsHandlers } from './materials'
import { teamsHandlers } from './teams'

export const handlers = [
  ...(isModuleMocked('auth')        ? authHandlers        : []),
  ...(isModuleMocked('users')       ? usersHandlers       : []),
  ...(isModuleMocked('dashboard')   ? dashboardHandlers   : []),
  ...(isModuleMocked('groups')      ? groupsHandlers      : []),
  ...(isModuleMocked('problems')    ? problemsHandlers    : []),
  ...(isModuleMocked('submissions') ? submissionsHandlers : []),
  ...(isModuleMocked('contests')    ? contestsHandlers    : []),
  ...(isModuleMocked('materials')   ? materialsHandlers   : []),
  ...(isModuleMocked('teams')       ? teamsHandlers       : []),
]
