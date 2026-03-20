import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

const CATEGORY_COLORS = {
  'Core':          { bg: 'bg-teal-50',   text: 'text-teal-700',   bar: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700'    },
  'Cognitive':     { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  'Future Skills': { bg: 'bg-amber-50',  text: 'text-amber-700',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700'  },
}

export default function ParentDashboard() {
  const { user, refreshProfile } = useAuth()
  const navigate                 = useNavigate()
  const location                 = useLocation()

  const [profile, setProfile]         = useState(null)
  const [stats, setStats]             = useState([])
  const [discoveries, setDiscoveries] = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [activeTab, setActiveTab]     = useState('performance')

  // Load fresh data every time this page is visited
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()
  }, [user, location.key]) // location.key changes every navigation — forces fresh load

  const loadAll = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch profile, flavour_stats, discoveries all in parallel
      const [profileRes, statsRes, discRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('flavour_stats')
          .select('*')
          .eq('user_id', user.id)
          .order('attempts', { ascending: false }),
        supabase
          .from('discoveries')
          .select('id, object_name, topic, flavour, flavour_category, score, total_questions, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      if (profileRes.error) console.error('profile error:', profileRes.error.message)
      if (statsRes.error)   console.error('flavour_stats error:', statsRes.error.message)
      if (discRes.error)    console.error('discoveries error:', discRes.error.message)

      setProfile(profileRes.data  || null)
      setStats(statsRes.data      || [])
      setDiscoveries(discRes.data || [])

      // Also refresh the auth context profile
      await refreshProfile()

    } catch (err) {
      console.error('loadAll error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // ── Computed totals from flavour_stats (source of truth) ──
  const totalAttempts  = stats.reduce((s, r) => s + (r.attempts        || 0), 0)
  const totalCorrect   = stats.reduce((s, r) => s + (r.total_score     || 0), 0)
  const totalQuestions = stats.reduce((s, r) => s + (r.total_questions || 0), 0)
  const overallPct     = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0

  // Use profile total_quizzes as fallback if stats not yet loaded
  const displayTotal = totalAttempts > 0
    ? totalAttempts
    : (profile?.total_quizzes || 0)

  // Group stats by category for performance tab
  const grouped = {}
  stats.forEach(s => {
    const cat = s.flavour_category || 'Core'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  // Interest: count how many times each flavour was attempted
  const flavourCount = {}
  discoveries.forEach(d => {
    const f = d.flavour || 'General Knowledge'
    flavourCount[f] = (flavourCount[f] || 0) + 1
  })
  const interestSorted = Object.entries(flavourCount)
    .sort((a, b) => b[1] - a[1])

  const discoveredObjects = [...new Set(
    discoveries.map(d => d.object_name).filter(Boolean)
  )]

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Parent Dashboard 👨‍👩‍👧</h2>
          <p className="text-sm text-gray-400">
            {profile?.child_name || 'Your child'}'s learning report
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs text-violet-600 font-semibold bg-violet-50 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-all disabled:opacity-50"
          >
            {refreshing ? (
              <span className="animate-spin">↻</span>
            ) : (
              <span>↻</span>
            )}
            Refresh
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-gray-400 hover:text-gray-600 font-semibold"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-violet-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-violet-700">{displayTotal}</p>
          <p className="text-xs text-violet-600 font-medium">Total quizzes</p>
        </div>
        <div className="bg-teal-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-teal-700">{overallPct}%</p>
          <p className="text-xs text-teal-600 font-medium">Overall accuracy</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{profile?.streak_count || 0}🔥</p>
          <p className="text-xs text-amber-600 font-medium">Day streak</p>
        </div>
      </div>

      {/* Last updated */}
      <p className="text-xs text-gray-400 text-right mb-4">
        Last updated: {new Date().toLocaleTimeString()}
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {[
          { key: 'performance', label: '📊 Performance' },
          { key: 'interests',   label: '⭐ Interests'   },
          { key: 'history',     label: '📋 History'     },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all
              ${activeTab === tab.key
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Performance ── */}
      {activeTab === 'performance' && (
        <div>
          {stats.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <p className="font-semibold text-gray-600 mb-1">No quiz data yet</p>
              <p className="text-sm text-gray-400 mb-5">Complete a quiz to see performance here</p>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl"
              >
                Start a Quiz
              </button>
            </div>
          ) : (
            <>
              {/* Overall accuracy bar */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-gray-700">Overall accuracy</p>
                  <p className="text-sm font-bold text-violet-700">{overallPct}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-violet-500 h-3 rounded-full transition-all"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {totalCorrect} correct answers out of {totalQuestions} total questions
                </p>
              </div>

              {/* Per category breakdown */}
              {Object.entries(grouped).map(([category, rows]) => {
                const colors     = CATEGORY_COLORS[category] || CATEGORY_COLORS['Core']
                const catCorrect = rows.reduce((s, r) => s + (r.total_score    || 0), 0)
                const catQs      = rows.reduce((s, r) => s + (r.total_questions|| 0), 0)
                const catPct     = catQs > 0 ? Math.round((catCorrect / catQs) * 100) : 0
                const catAttempts= rows.reduce((s, r) => s + (r.attempts       || 0), 0)

                return (
                  <div key={category} className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                        {category}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{catAttempts} quizzes</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {catPct}% avg
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {rows.map(s => {
                        const pct = s.total_questions > 0
                          ? Math.round((s.total_score / s.total_questions) * 100)
                          : 0
                        return (
                          <div key={s.id} className={`${colors.bg} rounded-2xl p-4`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className={`font-semibold text-sm ${colors.text}`}>{s.flavour}</p>
                              <p className={`text-sm font-bold ${colors.text}`}>{pct}%</p>
                            </div>
                            <div className="w-full bg-white rounded-full h-2.5 mb-2">
                              <div
                                className={`${colors.bar} h-2.5 rounded-full transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{s.attempts} {s.attempts === 1 ? 'attempt' : 'attempts'}</span>
                              <span>{s.total_score} correct / {s.total_questions} questions</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Interests ── */}
      {activeTab === 'interests' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Which flavours your child explores most
          </p>
          {interestSorted.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">⭐</div>
              <p className="font-semibold text-gray-600">No data yet</p>
              <p className="text-sm text-gray-400 mt-1">Complete some quizzes first</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-6">
                {interestSorted.map(([flav, count], i) => {
                  const maxCount = interestSorted[0][1]
                  const pct      = Math.round((count / maxCount) * 100)
                  return (
                    <div key={flav} className="bg-white border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-300">#{i + 1}</span>
                          <p className="font-semibold text-gray-800 text-sm">{flav}</p>
                        </div>
                        <span className="text-sm font-bold text-violet-600">
                          {count} {count === 1 ? 'quiz' : 'quizzes'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              {discoveredObjects.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Objects discovered ({discoveredObjects.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {discoveredObjects.slice(0, 20).map(name => (
                      <span key={name} className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── History ── */}
      {activeTab === 'history' && (
        <div>
          {discoveries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="font-semibold text-gray-600">No history yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {discoveries.map(d => {
                const pct    = d.total_questions > 0 ? Math.round((d.score / d.total_questions) * 100) : 0
                const cat    = d.flavour_category || 'Core'
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Core']
                return (
                  <div key={d.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {d.object_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {d.flavour || 'General Knowledge'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(d.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-lg leading-tight ${
                        pct >= 75 ? 'text-teal-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {pct}%
                      </p>
                      <p className="text-xs text-gray-400">{d.score}/{d.total_questions}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
