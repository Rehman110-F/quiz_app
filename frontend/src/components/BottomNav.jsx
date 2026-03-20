import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const { user, profile } = useAuth()
  const location          = useLocation()

  if (!user) return null
  if (['/login', '/register'].includes(location.pathname)) return null

  const isActive = (path) => location.pathname === path

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 h-14">
      <div className="max-w-2xl mx-auto h-full flex items-center justify-around px-6">

        <Link to="/" className={`flex flex-col items-center gap-0.5 transition-all ${isActive('/') ? 'text-violet-600' : 'text-gray-400'}`}>
          <span className="text-lg leading-none">📸</span>
          <span className="text-xs font-semibold">Home</span>
        </Link>

        <Link to="/parent-dashboard" className={`flex flex-col items-center gap-0.5 transition-all ${isActive('/parent-dashboard') ? 'text-violet-600' : 'text-gray-400'}`}>
          <span className="text-lg leading-none">📊</span>
          <span className="text-xs font-semibold">Dashboard</span>
        </Link>

        <Link to="/profile" className={`flex flex-col items-center gap-0.5 transition-all ${isActive('/profile') ? 'text-violet-600' : 'text-gray-400'}`}>
          <span className="text-lg leading-none">👦</span>
          <span className="text-xs font-semibold">Profile</span>
        </Link>

      </div>
    </div>
  )
}
