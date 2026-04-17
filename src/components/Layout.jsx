import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdDashboard, MdDirectionsCar, MdLogout, MdLocalShipping } from 'react-icons/md'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: MdDashboard },
  { to: '/vehicules',  label: 'Véhicules',       icon: MdDirectionsCar },
]

export default function Layout({ children }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="w-60 min-h-screen bg-[#1A3C6B] text-white flex flex-col shadow-xl flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <MdLocalShipping size={20} />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">PARCAUTO</p>
              <p className="text-white/50 text-xs">Gestion de flotte</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <MdLogout size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto bg-gray-100">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
