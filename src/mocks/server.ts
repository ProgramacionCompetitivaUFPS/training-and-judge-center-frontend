import { setupServer } from 'msw/node'
import { authHandlers } from './handlers/auth'
import { usersHandlers } from './handlers/users'
import { dashboardHandlers } from './handlers/dashboard'
import { groupsHandlers } from './handlers/groups'
import { problemsHandlers } from './handlers/problems'
import { submissionsHandlers } from './handlers/submissions'
import { contestsHandlers } from './handlers/contests'
import { materialsHandlers } from './handlers/materials'
import { teamsHandlers } from './handlers/teams'

// All specific handlers without the browser's catch-all passthrough.
// Using onUnhandledRequest:'error' so tests fail fast on unmatched requests
// instead of silently hitting the real backend.
export const server = setupServer(
  ...authHandlers,
  ...usersHandlers,
  ...dashboardHandlers,
  ...groupsHandlers,
  ...problemsHandlers,
  ...submissionsHandlers,
  ...contestsHandlers,
  ...materialsHandlers,
  ...teamsHandlers,
)
