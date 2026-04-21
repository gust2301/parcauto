import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUserRole, isAdminRole, isChauffeurRole, isViewerRole } from '../lib/roles'
import { RoleContext, useRole } from '../lib/roleContext'

export function RoleProvider({ session, children }) {
  const [scope, setScope] = useState({ chauffeur: null, vehiculeIds: [], loading: false })

  const user = session?.user || null
  const role = getUserRole(user)
  const isAdmin = isAdminRole(role)
  const isViewer = isViewerRole(role)
  const isChauffeur = isChauffeurRole(role)

  useEffect(() => {
    let cancelled = false

    async function loadChauffeurScope() {
      if (!user?.id || !isChauffeur) {
        setScope({ chauffeur: null, vehiculeIds: [], loading: false })
        return
      }

      setScope(s => ({ ...s, loading: true }))
      const { data: chauffeur } = await supabase
        .from('chauffeurs')
        .select('id, nom_complet, matricule, grade, user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!chauffeur) {
        if (!cancelled) setScope({ chauffeur: null, vehiculeIds: [], loading: false })
        return
      }

      const { data: affectations } = await supabase
        .from('chauffeur_vehicules')
        .select('vehicule_id')
        .eq('chauffeur_id', chauffeur.id)
        .eq('active', true)

      if (!cancelled) {
        setScope({
          chauffeur,
          vehiculeIds: (affectations || []).map(a => a.vehicule_id),
          loading: false,
        })
      }
    }

    loadChauffeurScope()
    return () => { cancelled = true }
  }, [user?.id, isChauffeur])

  const value = useMemo(() => {
    return {
      user,
      role,
      isAdmin,
      isViewer,
      isChauffeur,
      canReadAll: isAdmin || isViewer,
      canManage: isAdmin,
      chauffeur: scope.chauffeur,
      vehiculeIds: scope.vehiculeIds,
      scopeLoading: scope.loading,
    }
  }, [user, role, isAdmin, isViewer, isChauffeur, scope])

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

export function WriteAccessMessage() {
  return (
    <div className="card max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">Acces limite</h1>
      <p className="mt-2 text-sm text-gray-500">
        Votre role ne permet pas cette action sur ces donnees.
      </p>
    </div>
  )
}
