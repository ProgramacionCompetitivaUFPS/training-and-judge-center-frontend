import { authHandlers } from './auth'
import { usersHandlers } from './users'
import { groupsHandlers } from './groups'
import { problemsHandlers } from './problems'
import { submissionsHandlers } from './submissions'
import { contestsHandlers } from './contests'
import { materialsHandlers } from './materials'
import { teamsHandlers } from './teams'

export const handlers = [
  ...authHandlers,
  ...usersHandlers,
  ...groupsHandlers,
  ...problemsHandlers,
  ...submissionsHandlers,
  ...contestsHandlers,
  ...materialsHandlers,
  ...teamsHandlers,
]
