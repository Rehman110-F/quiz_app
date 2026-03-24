import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

const STARS = ['', '😞', '😕', '😐', '😊', '🤩']
const STAR_LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent']

function StatCard({ value, label, color }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]     = useState('feedback')
  const [feedback, setFeedback]       = useState([])
  const [users, setUsers]             = useState([])
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [stats, setStats]             = useState({ total: 0, avgRating: 0, totalUsers: 0 })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [feedbackRes, usersRes] = await Promise.all([
        supabase
          .from('feedback')
          .select('*, profiles(child_name, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
      ])

      const fb    = feedbackRes.data || []
      const us    = usersRes.data    || []
      const avg   = fb.length > 0
        ? (fb.reduce((s, f) => s + f.rating, 0) / fb.length).toFixed(1)
        : 0

      setFeedback(fb)
      setUsers(us)
      setStats({ total: fb.length, avgRating: avg, totalUsers: us.length })
    } catch (err) {
      console.error('Admin load error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function searchUser() {
    if (!searchEmail.trim()) return
    setSearchLoading(true)
    setSearchResult(null)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', searchEmail.trim().toLowerCase())
        .single()

      if (!profile) {
        setSearchResult({ notFound: true })
        return
      }

      const { data: discoveries } = await supabase
        .from('discoveries')
        .select('id, object_name, flavour, score, total_questions, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: userFeedback } = await supabase
        .from('feedback')
        .select('rating, message, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      setSearchResult({ profile, discoveries: discoveries || [], feedback: userFeedback || [] })
    } catch (err) {
      setSearchResult({ notFound: true })
    } finally {
      setSearchLoading(false)
    }
  }

  async function deleteUser(userId, email) {
    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId)
      return
    }

    try {
      // Delete all user data
      await Promise.all([
        supabase.from('discoveries').delete().eq('user_id', userId),
        supabase.from('flavour_stats').delete().eq('user_id', userId),
        supabase.from('feedback').delete().eq('user_id', userId),
      ])
      await supabase.from('profiles').delete().eq('id', userId)

      setUsers(prev => prev.filter(u => u.id !== userId))
      setFeedback(prev => prev.filter(f => f.user_id !== userId))
      setDeleteConfirm(null)
      if (searchResult?.profile?.id === userId) setSearchResult(null)
      alert(`User ${email} deleted successfully.`)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  async function deleteFeedback(id) {
    await supabase.from('feedback').delete().eq('id', id)
    setFeedback(prev => prev.filter(f => f.id !== id))
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
        <p className="text-sm text-gray-400">Loading admin panel...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel 🛡️</h1>
          <p className="text-sm text-gray-400">Logged in as {user?.email}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-violet-600 font-semibold bg-violet-50 px-3 py-1.5 rounded-full"
        >
          ← Back to App
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard value={stats.totalUsers}  label="Total users"    color="bg-violet-50 text-violet-700"/>
        <StatCard value={stats.total}       label="Total feedback"  color="bg-teal-50 text-teal-700"/>
        <StatCard value={`${stats.avgRating}★`} label="Avg rating"  color="bg-amber-50 text-amber-700"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {[
          { key: 'feedback', label: '💬 Feedback'   },
          { key: 'users',    label: '👥 Users'       },
          { key: 'search',   label: '🔍 Search User' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all
              ${activeTab === tab.key ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FEEDBACK TAB ── */}
      {activeTab === 'feedback' && (
        <div>
          {/* Rating distribution */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Rating distribution</p>
            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = feedback.filter(f => f.rating === star).length
                const pct   = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm w-6">{star}★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-2.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feedback list */}
          {feedback.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-medium">No feedback yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feedback.map(f => (
                <div key={f.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{STARS[f.rating]}</span>
                        <span className="text-sm font-bold text-gray-700">{STAR_LABELS[f.rating]}</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                          {f.rating}/5
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {f.profiles?.email || 'Unknown user'} ·{' '}
                        {new Date(f.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteFeedback(f.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium ml-2 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  {f.message && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mt-2">
                      "{f.message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{users.length} registered users</p>
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-medium">No users yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map(u => (
                <div key={u.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {u.child_name || 'No name'} — <span className="text-gray-500 font-normal">{u.email}</span>
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>🔥 {u.streak_count || 0} streak</span>
                        <span>📝 {u.total_quizzes || 0} quizzes</span>
                        <span>🌐 {u.language || 'english'}</span>
                        <span>👶 {u.age_group || '-'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 transition-all
                        ${deleteConfirm === u.id
                          ? 'bg-red-500 text-white'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                        }`}
                    >
                      {deleteConfirm === u.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH TAB ── */}
      {activeTab === 'search' && (
        <div>
          {/* Search input */}
          <div className="flex gap-3 mb-5">
            <input
              type="email"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder="Search by email address..."
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-violet-400 text-sm"
            />
            <button
              onClick={searchUser}
              disabled={searchLoading || !searchEmail.trim()}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white font-bold rounded-2xl transition-all"
            >
              {searchLoading ? '...' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {searchResult?.notFound && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium">No user found with that email</p>
            </div>
          )}

          {searchResult?.profile && (
            <div>
              {/* User card */}
              <div className="bg-white border-2 border-violet-200 rounded-2xl p-5 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {searchResult.profile.child_name || 'No name'}
                    </h3>
                    <p className="text-sm text-gray-500">{searchResult.profile.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {new Date(searchResult.profile.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteUser(searchResult.profile.id, searchResult.profile.email)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all
                      ${deleteConfirm === searchResult.profile.id
                        ? 'bg-red-500 text-white'
                        : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                  >
                    {deleteConfirm === searchResult.profile.id ? 'Confirm delete?' : 'Delete user'}
                  </button>
                </div>

                {/* User stats */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-violet-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-violet-700">{searchResult.profile.total_quizzes || 0}</p>
                    <p className="text-xs text-violet-600">Quizzes</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-amber-700">{searchResult.profile.streak_count || 0}🔥</p>
                    <p className="text-xs text-amber-600">Streak</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-teal-700">{searchResult.profile.age_group || '-'}</p>
                    <p className="text-xs text-teal-600">Age group</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-gray-700">{searchResult.profile.language || 'en'}</p>
                    <p className="text-xs text-gray-500">Language</p>
                  </div>
                </div>

                {/* Recent discoveries */}
                {searchResult.discoveries.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Recent discoveries
                    </p>
                    <div className="flex flex-col gap-2">
                      {searchResult.discoveries.slice(0, 5).map(d => (
                        <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{d.object_name}</p>
                            <p className="text-xs text-gray-400">{d.flavour}</p>
                          </div>
                          <p className="text-sm font-bold text-violet-600">
                            {d.score}/{d.total_questions}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User feedback */}
                {searchResult.feedback.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Their feedback
                    </p>
                    {searchResult.feedback.map((f, i) => (
                      <div key={i} className="bg-amber-50 rounded-xl px-3 py-2 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{STARS[f.rating]}</span>
                          <span className="text-xs font-semibold text-amber-700">{f.rating}/5</span>
                        </div>
                        {f.message && <p className="text-xs text-gray-600">"{f.message}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
