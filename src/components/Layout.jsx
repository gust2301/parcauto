import { createElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdDashboard, MdDirectionsCar, MdLogout, MdPerson, MdSettings } from 'react-icons/md'
import logo from '../assets/sn-cfs-flotte-favicon-transparent-large.png'
import { useRole } from '../lib/roleContext'
import { ROLE_LABELS } from '../lib/roles'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: MdDashboard },
  { to: '/vehicules', label: 'Vehicules', icon: MdDirectionsCar },
  { to: '/chauffeurs', label: 'Chauffeurs', icon: MdPerson },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { isAdmin, role } = useRole()
  const visibleNavItems = isAdmin
    ? [...navItems, { to: '/settings', label: 'Parametres', icon: MdSettings }]
    : navItems

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 min-h-screen bg-[#1A3C6B] text-white lg:flex flex-col shadow-xl flex-shrink-0 print:hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SN-CFS Flotte" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <p className="font-bold text-white text-sm leading-tight">SN-CFS Flotte</p>
              <p className="text-white/50 text-xs">Gestion de flotte</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {createElement(icon, { size: 20 })}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6 space-y-1">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-white/40">
            {ROLE_LABELS[role] || 'Lecture seule'}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <MdLogout size={20} />
            Deconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-100 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden print:hidden">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SN-CFS Flotte" className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <p className="text-sm font-bold leading-tight text-[#1A3C6B]">SN-CFS Flotte</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[role] || 'Lecture seule'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Deconnexion"
          >
            <MdLogout size={20} />
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-gray-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] lg:hidden print:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}>
        {visibleNavItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                isActive ? 'bg-[#1A3C6B]/10 text-[#1A3C6B]' : 'text-gray-500'
              }`
            }
          >
            {createElement(icon, { size: 21 })}
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
