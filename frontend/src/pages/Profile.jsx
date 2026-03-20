import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [discoveries, setDiscoveries] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchDiscoveries()
    refreshProfile()
  }, [user])

  async function fetchDiscoveries() {
    const { data } = await supabase
      .from('discoveries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setDiscoveries(data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Profile header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center text-2xl">
              👦
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {profile?.child_name || 'Explorer'}
              </h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-red-500 transition-all"
          >
            Sign out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {profile?.streak_count || 0}🔥
            </p>
            <p className="text-xs text-amber-700 font-medium">Day streak</p>
          </div>
          <div className="bg-violet-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-violet-600">
              {profile?.total_quizzes || 0}
            </p>
            <p className="text-xs text-violet-700 font-medium">Quizzes done</p>
          </div>
          <div className="bg-teal-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">
              {discoveries.length}
            </p>
            <p className="text-xs text-teal-700 font-medium">Discoveries</p>
          </div>
        </div>
        {/* PASTE THE BUTTON HERE */}
        <button
          onClick={() => navigate('/parent-dashboard')}
          className="w-full py-3 bg-white border-2 border-violet-200 rounded-2xl text-violet-600 font-bold text-sm mt-4 hover:bg-violet-50 transition-colors"
        >
          📊 View Parent Dashboard
        </button>
      </div>

      {/* Discoveries list */}
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
        My Discoveries 🗺️
      </h3>

      {discoveries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📷</div>
          <p className="font-medium">No discoveries yet!</p>
          <p className="text-sm">Take a photo to start exploring</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold"
          >
            Start Exploring
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {discoveries.map(d => (
            <div
              key={d.id}
              className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-800">{d.object_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {d.topic} · {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-violet-600">
                  {d.score}/{d.total_questions}
                </p>
                <p className="text-xs text-gray-400">score</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
