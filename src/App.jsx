import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicules from './pages/Vehicules'
import VehiculeDetail from './pages/VehiculeDetail'
import EntretienForm from './pages/EntretienForm'
import CarburantForm from './pages/CarburantForm'
import ContraventionForm from './pages/ContraventionForm'
import Chauffeurs from './pages/Chauffeurs'
import Settings from './pages/Settings'
import { AdminRequiredMessage, RoleProvider } from './components/RoleContext'
import { useRole } from './lib/roleContext'

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return (
    <RoleProvider session={session}>
      <Layout>{children}</Layout>
    </RoleProvider>
  )
}

function RequireAdmin({ children }) {
  const { isAdmin } = useRole()
  if (!isAdmin) return <AdminRequiredMessage />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard"   element={<ProtectedRoute session={session}><Dashboard /></ProtectedRoute>} />
        <Route path="/vehicules"   element={<ProtectedRoute session={session}><Vehicules /></ProtectedRoute>} />
        <Route path="/vehicules/:id" element={<ProtectedRoute session={session}><VehiculeDetail /></ProtectedRoute>} />
        <Route path="/vehicules/:id/entretien/new"    element={<ProtectedRoute session={session}><RequireAdmin><EntretienForm /></RequireAdmin></ProtectedRoute>} />
        <Route path="/vehicules/:id/carburant/new"    element={<ProtectedRoute session={session}><CarburantForm /></ProtectedRoute>} />
        <Route path="/vehicules/:id/contravention/new" element={<ProtectedRoute session={session}><RequireAdmin><ContraventionForm /></RequireAdmin></ProtectedRoute>} />
        <Route path="/chauffeurs"  element={<ProtectedRoute session={session}><Chauffeurs /></ProtectedRoute>} />
        <Route path="/settings"    element={<ProtectedRoute session={session}><RequireAdmin><Settings /></RequireAdmin></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
