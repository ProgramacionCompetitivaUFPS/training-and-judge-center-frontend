import { ApiClientError } from './errors'

// Mapa de código de error del backend -> mensaje en español para mostrar al usuario.
// El backend (Go) devuelve sus mensajes en inglés (campo `message`); este diccionario
// es la fuente de verdad del texto que sí se muestra. Extraído exhaustivamente de
// cada `apperror.New*(code, "...")` en training-and-judge-center-backend.
//
// Varios códigos genéricos (INSUFFICIENT_PERMISSIONS, NOT_FOUND, FORBIDDEN, etc.) se
// reutilizan en el backend para decenas de reglas de negocio distintas sin distinción
// — en esos casos el mensaje aquí es deliberadamente genérico, no se perdió precisión
// que el propio código de error ya tuviera.
export const ERROR_MESSAGES: Record<string, string> = {
  // ─── Genéricos / infraestructura (pkg/apperror universal) ───
  NOT_FOUND: 'Recurso no encontrado',
  BAD_REQUEST: 'Solicitud inválida',
  UNAUTHORIZED: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo',
  FORBIDDEN: 'No tienes permisos para realizar esta acción',
  INTERNAL_ERROR: 'Ocurrió un error inesperado',
  VALIDATION_ERROR: 'Los datos enviados no son válidos',
  PAYLOAD_TOO_LARGE: 'El archivo o la solicitud es demasiado grande',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible temporalmente. Intenta de nuevo más tarde',
  RATE_LIMIT_EXCEEDED: 'Espera un momento antes de volver a enviar',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Inténtalo de nuevo más tarde',
  INVALID_PACKAGE: 'El paquete del problema no es válido',

  // ─── Usuarios: autenticación, perfil, cuenta ───
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos',
  ACCOUNT_DEACTIVATED: 'Esta cuenta ha sido desactivada',
  INVALID_CODE: 'El código de verificación no es válido o ha expirado',
  EXPIRED_CODE: 'El código de confirmación ha expirado. Solicita uno nuevo',
  MAX_ATTEMPTS_EXCEEDED: 'Superaste el número máximo de intentos. Inténtalo de nuevo más tarde',
  EMAIL_DELIVERY_FAILED: 'No se pudo enviar el correo. Inténtalo de nuevo más tarde',
  ADMIN_PROFILE_RESTRICTED: 'Los perfiles de administradores solo son visibles para otros administradores',
  NO_PENDING_REQUEST: 'No se encontró una solicitud de desactivación pendiente',
  ADMIN_CANNOT_REQUEST_DEACTIVATION: 'Los administradores no pueden desactivar su propia cuenta',
  INVALID_RECOVERY_ATTEMPT: 'Correo o código de recuperación inválido',
  CANNOT_SELF_DEACTIVATE: 'Los administradores no pueden desactivar su propia cuenta',
  CANNOT_DEACTIVATE_ADMIN: 'No se puede desactivar a otro administrador',
  PASSWORD_ALREADY_SET: 'El usuario ya tiene una contraseña configurada',
  CANNOT_UNLINK_LAST_CREDENTIAL: 'No puedes desvincular tu cuenta de Google sin tener una contraseña configurada; configura una contraseña primero',
  EMAIL_CHANGE_NOT_PENDING: 'No hay una solicitud de cambio de correo pendiente',
  PASSWORD_RECOVERY_NOT_PENDING: 'No hay una solicitud de recuperación de contraseña pendiente',
  ALREADY_DEACTIVATED: 'La cuenta ya está desactivada o no existe',
  CANNOT_UPDATE_DEACTIVATED: 'No se puede actualizar la información de una cuenta desactivada',
  CANNOT_ASSIGN_ADMIN_ROLE: 'El rol Administrador no se puede asignar mediante esta actualización',
  USER_NOT_FOUND: 'Usuario no encontrado',
  NICKNAME_NOT_FOUND: 'No se encontró ningún usuario con ese nickname',
  EMAIL_NOT_FOUND: 'No se encontró ningún usuario con ese correo',
  REFRESH_TOKEN_ALREADY_REVOKED: 'El token de sesión ya fue revocado',
  REFRESH_TOKEN_EXPIRED: 'La sesión ha superado su tiempo máximo permitido. Inicia sesión nuevamente',
  EMAIL_CONFLICT: 'Este correo ya está en uso',
  NICKNAME_CONFLICT: 'Este nickname ya está en uso',

  // ─── Google OAuth ───
  INVALID_GOOGLE_TOKEN: 'El token de Google no es válido',
  GOOGLE_EMAIL_NOT_VERIFIED: 'El correo de la cuenta de Google no está verificado',
  INVALID_GOOGLE_EMAIL: 'El correo de la cuenta de Google no es válido',
  GOOGLE_ACCOUNT_LINK_REQUIRED: 'Ya existe una cuenta con este correo. Inicia sesión con tu contraseña y vincula tu cuenta de Google desde la configuración de tu perfil',
  OAUTH_IDENTITY_CONFLICT: 'Esta cuenta de Google ya está vinculada a otro usuario',
  OAUTH_IDENTITY_ALREADY_LINKED: 'Ya tienes una cuenta de Google vinculada',
  OAUTH_IDENTITY_NOT_FOUND: 'No había una cuenta de Google vinculada',

  // ─── Grupos ───
  INSUFFICIENT_PERMISSIONS: 'No tienes permisos para realizar esta acción',
  INVALID_JOIN_POLICY: 'Esta acción no está disponible con la política de unión actual del grupo',
  CONFIRMATION_MISMATCH: 'El nombre de confirmación no coincide con el nombre del grupo',
  GROUP_NOT_FOUND: 'Grupo no encontrado',
  REQUEST_NOT_FOUND: 'No se encontró una solicitud para este grupo',
  REQUEST_ALREADY_PROCESSED: 'Esta solicitud ya fue procesada',
  REQUEST_ALREADY_PENDING: 'Ya existe una solicitud de ingreso pendiente para este grupo',
  NAME_ALREADY_EXISTS: 'Ya existe un grupo con este nombre',
  ROLE_UNCHANGED: 'El miembro ya tiene ese rol en el grupo',
  ALREADY_MEMBER: 'Ya eres miembro de este grupo',
  NOT_A_MEMBER: 'No es miembro de este grupo',
  NOT_GROUP_MEMBER: 'Solo los miembros del grupo pueden realizar esta acción',
  INVITATION_NOT_FOUND: 'Invitación no encontrada',
  INVITATION_ALREADY_PROCESSED: 'Esta invitación ya fue procesada',
  INVITATION_EXPIRED: 'Esta invitación ha expirado',
  INVITATION_REVOKED: 'Esta invitación fue revocada',
  INVALID_LEAD_ASSIGNMENT: 'Solo los Coaches y Administradores pueden ser asignados como líderes',
  CANNOT_REMOVE_LAST_LEAD: 'No puedes quitar al único líder del grupo. Asigna otro líder primero',
  CANNOT_ADD_TO_GLOBAL_GROUP: 'No se pueden agregar miembros manualmente al grupo global',
  CANNOT_REMOVE_FROM_GLOBAL_GROUP: 'No se pueden eliminar miembros del grupo global',
  CANNOT_LEAVE_GLOBAL_GROUP: 'No puedes salir del grupo global',
  CANNOT_LEAVE_AS_LAST_LEAD: 'No puedes salir del grupo porque eres el único líder. Asigna otro líder primero',
  CANNOT_DELETE_GLOBAL_GROUP: 'El grupo global no se puede eliminar',
  CANNOT_MODIFY_GLOBAL_GROUP: 'El grupo global no se puede modificar',
  INVALID_POLICY_COMBINATION: 'Los grupos no visibles solo pueden usar la política de unión por invitación',
  NO_FIELDS_TO_UPDATE: 'Debes proporcionar al menos un campo para actualizar',

  // ─── Equipos ───
  TEAM_NOT_FOUND: 'Equipo no encontrado',
  TEAM_NAME_EXISTS: 'Ya existe un equipo con este nombre',
  MEMBER_ALREADY_ON_TEAM: 'El usuario ya es miembro del equipo',
  NOT_TEAM_MEMBER: 'No es miembro de este equipo',
  ALREADY_INVITED: 'El usuario ya tiene una invitación pendiente a este equipo',
  NOT_YOUR_INVITATION: 'Esta invitación no fue enviada a ti',
  CANNOT_LEAVE_DURING_ACTIVE_CONTEST: 'No puedes salir del equipo mientras esté seleccionado en una competencia activa',
  MEMBER_NOT_IN_GROUP: 'Debes ser miembro del grupo de la competencia para realizar esta acción',
  TEAMS_NOT_ALLOWED: 'Esta competencia no permite inscripción por equipos',
  CONTEST_NOT_OPEN_FOR_REGISTRATION: 'La competencia no está abierta para inscripciones',
  INVALID_SELECTED_MEMBER: 'Verifica los miembros seleccionados: no deben repetirse y todos deben pertenecer al equipo',
  INVALID_TEAM_SIZE: 'La cantidad de miembros seleccionados debe estar dentro del límite permitido por la competencia',
  MEMBER_ALREADY_REGISTERED: 'Uno o más miembros ya están registrados individualmente en esta competencia',
  MEMBER_IN_ANOTHER_TEAM: 'Uno o más miembros ya están registrados en otro equipo para esta competencia',
  ALREADY_IN_TEAM: 'Ya estás inscrito en esta competencia como parte de un equipo seleccionado',
  TEAM_ALREADY_REGISTERED: 'El equipo ya está inscrito en esta competencia',
  TEAM_REGISTRATION_NOT_FOUND: 'No se encontró la inscripción del equipo',
  CONTEST_HAS_TEAM_REGISTRATIONS: 'No se puede cambiar la modalidad o el tamaño de equipo: ya hay equipos registrados en esta competencia',

  // ─── Competencias ───
  CONTEST_NOT_FOUND: 'Competencia no encontrada',
  CONTEST_LOCKED: 'Esta competencia está bloqueada y no se puede modificar',
  CONTEST_IS_ACTIVE: 'No se puede eliminar una competencia activa',
  CONTEST_NOT_ACTIVE: 'El rejuzgamiento solo está permitido durante competencias activas',
  CONTEST_ALREADY_STARTED: 'La competencia ya ha comenzado',
  CANNOT_UNREGISTER_AFTER_START: 'No puedes cancelar el registro después de que la competencia haya comenzado',
  NOT_REGISTERED: 'Debes estar inscrito en la competencia para realizar esta acción',
  START_TIME_IN_PAST: 'La fecha de inicio debe ser futura',
  END_TIME_IN_PAST: 'La fecha de fin debe ser futura',
  INVALID_TIME_RANGE: 'La fecha de fin debe ser posterior a la fecha de inicio',
  INVALID_DATE_RANGE: 'La fecha inicial debe ser anterior o igual a la fecha final',
  FREEZE_TOO_LONG: 'El tiempo de freeze debe ser menor que la duración de la competencia',
  ONLY_OWNER_OR_ADMIN_CAN_UNLOCK: 'Solo el dueño de la competencia o un Administrador puede bloquearla o desbloquearla',
  PROBLEM_ACCESS_DENIED: 'No puedes agregar un problema privado del que no eres colaborador',
  PROBLEM_NOT_IN_CONTEST: 'El problema especificado no forma parte de esta competencia',
  LEADS_CANNOT_REGISTER: 'Los líderes no pueden inscribirse a competencias',
  ADMINS_CANNOT_REGISTER: 'Los administradores no pueden inscribirse a competencias',
  INVALID_SORT: 'El criterio de ordenamiento no es válido',

  // ─── Problemas ───
  SLUG_ALREADY_EXISTS: 'Ya existe un problema con ese slug',
  MODIFIER_ALREADY_EXISTS: 'El usuario ya es colaborador de este problema',
  MODIFIER_NOT_FOUND: 'El usuario no es colaborador de este problema',
  SOLUTION_NOT_FOUND: 'Solución no encontrada',
  TOO_MANY_MODIFIERS: 'Se alcanzó el número máximo de colaboradores',
  ALREADY_DRAFT: 'Ya está en borrador',
  ALREADY_PUBLISHED: 'Ya está publicado',
  SLUG_MISMATCH: 'El slug de confirmación no coincide con el del problema',
  PROBLEM_NOT_FOUND: 'Problema no encontrado',
  PROBLEM_IN_ACTIVE_CONTEST: 'No se puede modificar un problema que está siendo usado en una competencia activa',
  VALIDATION_IN_PROGRESS: 'Ya hay una validación en progreso para este problema. Espera a que termine antes de modificar los archivos',
  PROBLEM_FILE_NOT_FOUND: 'El problema no tiene ese archivo, o ya no está disponible en el almacenamiento',
  PROBLEM_IS_PUBLISHED: 'No se puede modificar un problema publicado. Despublícalo primero',
  PROBLEM_MISSING_FILENAME: 'Debes indicar el nombre del archivo',
  PROBLEM_INVALID_FILE_TYPE: 'Tipo de archivo inválido. Permitidos: testCases, solution, checker, validator',
  PROBLEM_UNSUPPORTED_FILE_EXT: 'Extensión de archivo no soportada para este tipo de archivo',
  FILE_NAME_NOT_APPLICABLE: 'El nombre de archivo no aplica para este tipo de eliminación',
  PROBLEM_NOT_PUBLISHED: 'Solo problemas publicados aceptan envíos',
  NO_SUBMISSIONS_TO_REJUDGE: 'No hay envíos pendientes de rejuzgar para este problema',
  VALIDATION_TIMED_OUT: 'La validación está tardando más de lo esperado; vuelve a intentarlo más tarde',

  // ─── Materiales ───
  MATERIAL_NOT_FOUND: 'Material no encontrado',
  CANNOT_PIN_DRAFT: 'No se puede fijar un borrador',
  NOT_MATERIAL_AUTHOR: 'Solo el autor del material puede realizar esta acción',

  // ─── Envíos ───
  ACCESS_DENIED: 'No tienes acceso a este envío',
  PROBLEM_NOT_ACCESSIBLE: 'Solo el autor, un administrador o un colaborador pueden enviar soluciones a problemas privados',
  DUPLICATE_SUBMISSION: 'Ya enviaste este mismo archivo a este problema',
  FILE_TOO_LARGE: 'El archivo supera el tamaño máximo permitido',
  COMPILER_MISMATCH: 'El lenguaje, el compilador o la extensión del archivo no coinciden',
  SUBMISSION_NOT_FOUND: 'Envío no encontrado',
  CONTEST_NOT_STARTED: 'Los envíos solo se permiten durante competencias activas o en modo postcompetencia',
  CONTEST_FINISHED: 'La competencia ya finalizó y el modo postcompetencia no está habilitado',
  NO_REJUDGE_NEEDED: 'Este envío no necesita ser rejuzgado: no ha habido cambios en el juzgamiento desde que se envió',
  CANNOT_REJUDGE_IN_ACTIVE_CONTEST: 'No puedes rejuzgar tus propios envíos durante una competencia activa',
  INVALID_LANGUAGE: 'Lenguaje no soportado. Usa C++ 20, Java 17 o Python 3.10',
  NO_TEST_CASES: 'Este problema todavía no tiene casos de prueba, así que no se puede juzgar',
  SOURCE_CODE_NOT_FOUND: 'El código fuente de este envío ya no está disponible',
  INVALID_STATUS_TRANSITION: 'El envío cambió de estado mientras se procesaba la acción. Recarga e inténtalo de nuevo',
  CONTEST_CONFLICT: 'Alguien más modificó esta competencia al mismo tiempo. Recarga e inténtalo de nuevo',
  VALIDATION_PIPELINE_NOT_READY: 'El sistema de validación de problemas no está disponible en este momento. Inténtalo más tarde',
  CANNOT_REMOVE_ADMIN_FROM_GLOBAL_GROUP: 'No se puede quitar a un administrador del grupo global',
}

// Devuelve el mensaje en español para un error de la API, usando el código para
// buscarlo en ERROR_MESSAGES. Si el código no está mapeado, cae al mensaje crudo
// del backend (mejor que nada) y, si no es un ApiClientError, a `fallback`.
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.'): string {
  if (error instanceof ApiClientError) {
    return ERROR_MESSAGES[error.code] ?? error.message
  }
  return fallback
}
