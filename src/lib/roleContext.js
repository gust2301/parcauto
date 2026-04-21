import { createContext, useContext } from 'react'

export const RoleContext = createContext({
  user: null,
  role: 'viewer',
  isAdmin: false,
  isViewer: true,
  isChauffeur: false,
  canReadAll: true,
  canManage: false,
  chauffeur: null,
  vehiculeIds: [],
  scopeLoading: false,
})

export function useRole() {
  return useContext(RoleContext)
}
