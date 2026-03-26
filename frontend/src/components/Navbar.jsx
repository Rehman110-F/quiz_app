import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile } = useAuth()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
         <img src="/logo.svg" alt="SnapQuiz" className="w-9 h-9" />
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">KongoSnap</h1>
            <p className="text-xs text-gray-400">Learn from anything.</p>
          </div>
        </Link>

        {user && (
          <Link to="/profile" className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold text-amber-700">
                {profile?.streak_count || 0}
              </span>
            </div>
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-lg">
              👦
            </div>
          </Link>
        )}
      </div>
    </nav>
  )
}
