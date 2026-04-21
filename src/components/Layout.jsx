import { createElement, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdDashboard, MdDirectionsCar, MdLogout, MdPerson, MdSettings } from 'react-icons/md'
import { CreditCard } from 'lucide-react'
import logo from '../assets/sn-cfs-flotte-favicon-transparent-large.png'
import { useRole } from '../lib/roleContext'
import { ROLE_LABELS } from '../lib/roles'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: MdDashboard },
  { to: '/vehicules', label: 'Vehicules', icon: MdDirectionsCar },
  { to: '/chauffeurs', label: 'Chauffeurs', icon: MdPerson },
  { to: '/peage/cartes', label: 'Cartes de péage', icon: CreditCard, badge: 'peageLow' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { isAdmin, role } = useRole()
  const [lowPeageCount, setLowPeageCount] = useState(0)
  const visibleNavItems = isAdmin
    ? [...navItems, { to: '/settings', label: 'Parametres', icon: MdSettings }]
    : navItems

  useEffect(() => {
    async function loadLowPeageCount() {
      const [{ data: cartes }, { data: txs }] = await Promise.all([
        supabase.from('peage_cartes').select('id, seuil_alerte'),
        supabase.from('peage_transactions').select('carte_id, montant, type').not('carte_id', 'is', null),
      ])
      const count = (cartes || []).filter(carte => {
        const solde = (txs || [])
          .filter(t => t.carte_id === carte.id)
          .reduce((sum, t) => {
            if (t.type === 'rechargement') return sum + (t.montant || 0)
            if (t.type === 'passage_carte') return sum - (t.montant || 0)
            return sum
          }, 0)
        return solde < (carte.seuil_alerte || 0)
      }).length
      setLowPeageCount(count)
    }
    loadLowPeageCount()
    window.addEventListener('peage-cartes-updated', loadLowPeageCount)
    return () => window.removeEventListener('peage-cartes-updated', loadLowPeageCount)
  }, [])

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
          {visibleNavItems.map(({ to, label, icon, badge }) => (
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
              <span className="flex-1">{label}</span>
              {badge === 'peageLow' && lowPeageCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{lowPeageCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6 space-y-3">
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
          <div className="flex flex-col items-center gap-2 border-t border-white/15 pt-3">
            <span className="text-[10px] text-white/40">© 2026 · Tous droits réservés</span>
            <a
              href="https://www.linkedin.com/in/augustin-varore-05969714b"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded bg-[#0077B5] px-2.5 py-1.5 no-underline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="text-[11px] font-medium text-white">Augustin VARORE</span>
            </a>
          </div>
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
        {visibleNavItems.map(({ to, label, icon, badge }) => (
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
            <span className="relative max-w-full truncate">
              {label}
              {badge === 'peageLow' && lowPeageCount > 0 && (
                <span className="absolute -right-3 -top-2 rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{lowPeageCount}</span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
