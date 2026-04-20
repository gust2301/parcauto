import { createContext, useContext } from 'react'

export const RoleContext = createContext({
  user: null,
  role: 'user',
  isAdmin: false,
})

export function useRole() {
  return useContext(RoleContext)
}
