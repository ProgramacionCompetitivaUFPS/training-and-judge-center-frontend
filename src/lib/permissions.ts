import type { UserRole } from '@/types/user'
import type { GroupRole } from '@/types/group'

/**
 * Indica si una persona puede realizar acciones de líder en un grupo.
 * Es la misma regla que usa el backend: un admin siempre cuenta, y un miembro
 * cuenta solo si lidera el grupo. Un COACH que no lidera el grupo no cuenta.
 */
export function isGroupLeadOrAdmin(
  systemRole: UserRole | undefined,
  groupRole: GroupRole | null | undefined,
): boolean {
  return systemRole === 'ADMIN' || groupRole === 'LEAD'
}
