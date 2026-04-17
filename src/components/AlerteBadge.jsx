import { differenceInDays, parseISO } from 'date-fns'

export default function AlerteBadge({ dateEcheance, showDays = true }) {
  if (!dateEcheance) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Non défini</span>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const echeance = typeof dateEcheance === 'string' ? parseISO(dateEcheance) : dateEcheance
  const jours = differenceInDays(echeance, today)

  if (jours > 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        🟢 {showDays ? `${jours}j` : 'OK'}
      </span>
    )
  } else if (jours >= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        🟠 {showDays ? `${jours}j` : 'Bientôt'}
      </span>
    )
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        🔴 {showDays ? (jours < 0 ? `Expiré (${Math.abs(jours)}j)` : `${jours}j`) : 'Urgent'}
      </span>
    )
  }
}
