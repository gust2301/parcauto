import { useMemo } from 'react'
import { getUserRole, isAdminRole } from '../lib/roles'
import { RoleContext, useRole } from '../lib/roleContext'

export function RoleProvider({ session, children }) {
  const value = useMemo(() => {
    const user = session?.user || null
    const role = getUserRole(user)
    return { user, role, isAdmin: isAdminRole(role) }
  }, [session])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = useRole()
  return isAdmin ? children : fallback
}

export function AdminRequiredMessage() {
  return (
    <div className="card max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">Acces reserve</h1>
      <p className="mt-2 text-sm text-gray-500">
        Seuls les administrateurs peuvent creer, modifier ou supprimer des donnees.
      </p>
    </div>
  )
}
