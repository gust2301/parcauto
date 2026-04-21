export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  CHAUFFEUR: 'chauffeur',
  USER: 'viewer',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.VIEWER]: 'Lecture seule',
  [ROLES.CHAUFFEUR]: 'Chauffeur',
}

export function getUserRole(user) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role || ROLES.USER
  return String(role).trim().toLowerCase()
}

export function isAdminRole(role) {
  return String(role).trim().toLowerCase() === ROLES.ADMIN
}

export function isViewerRole(role) {
  return String(role).trim().toLowerCase() === ROLES.VIEWER
}

export function isChauffeurRole(role) {
  return String(role).trim().toLowerCase() === ROLES.CHAUFFEUR
}
