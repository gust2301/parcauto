export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
}

export function getUserRole(user) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role || ROLES.USER
  return String(role).trim().toLowerCase()
}

export function isAdminRole(role) {
  return String(role).trim().toLowerCase() === ROLES.ADMIN
}
