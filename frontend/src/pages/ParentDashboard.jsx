import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

const CATEGORY_COLORS = {
  'Core':          { bg: 'bg-teal-50',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-700',     bar: '#1D9E75', barLight: '#9FE1CB' },
  'Cognitive':     { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', bar: '#7c3aed', barLight: '#c4b5fd' },
  'Future Skills': { bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',   bar: '#BA7517', barLight: '#FAC775' },
}

const CATEGORY_ICONS = {
  'Core':          '🔬',
  'Cognitive':     '🧩',
  'Future Skills': '🚀',
}

// Single horizontal bar chart for one flavour row
function FlavourBar({ flavour, pct, attempts, correct, total, color, lightColor }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-700 truncate mr-2">{flavour}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{attempts} {attempts === 1 ? 'attempt' : 'attempts'}</span>
          <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="relative w-full bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className="h-5 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
          style={{ width: `${width}%`, backgroundColor: color, minWidth: width > 0 ? '32px' : '0' }}
        >
          {pct >= 20 && (
            <span className="text-white text-xs font-bold">{correct}/{total}</span>
          )}
        </div>
        {pct < 20 && pct > 0 && (
          <span className="absolute left-2 top-0 h-5 flex items-center text-xs font-bold text-gray-500">
            {correct}/{total}
          </span>
        )}
      </div>
    </div>
  )
}

// Radar-style polygon chart for category overview
function CategoryRadarCard({ category, rows, colors }) {
  const canvasRef = useRef(null)
  const maxFlavours = rows.length
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const r = 70

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width  = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const n = rows.length
    if (n < 2) return

    const angles = rows.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2)

    // Draw grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (r * ring) / 4
      ctx.beginPath()
      angles.forEach((angle, i) => {
        const x = cx + rr * Math.cos(angle)
        const y = cy + rr * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axis lines
    angles.forEach(angle => {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw data polygon
    const dataPoints = rows.map((s, i) => {
      const pct = s.total_questions > 0 ? s.total_score / s.total_questions : 0
      const rr  = r * pct
      return {
        x: cx + rr * Math.cos(angles[i]),
        y: cy + rr * Math.sin(angles[i])
      }
    })

    ctx.beginPath()
    dataPoints.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y))
    ctx.closePath()
    ctx.fillStyle   = colors.bar + '33'
    ctx.fill()
    ctx.strokeStyle = colors.bar
    ctx.lineWidth   = 2
    ctx.stroke()

    // Dots on data points
    dataPoints.forEach(pt => {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
      ctx.fillStyle   = colors.bar
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth   = 2
      ctx.stroke()
    })

    // Labels
    ctx.font      = `500 10px sans-serif`
    ctx.fillStyle = '#374151'
    ctx.textAlign = 'center'
    angles.forEach((angle, i) => {
      const labelR = r + 18
      const lx     = cx + labelR * Math.cos(angle)
      const ly     = cy + labelR * Math.sin(angle)
      const words  = rows[i].flavour.split(' ')
      const label  = words.length > 2 ? words[0] : rows[i].flavour
      ctx.fillText(label, lx, ly + 4)
    })

  }, [rows])

  // For single flavour, show a simple donut instead
  if (rows.length === 1) {
    const s   = rows[0]
    const pct = s.total_questions > 0 ? Math.round((s.total_score / s.total_questions) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5"/>
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={colors.bar} strokeWidth="3.5"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: colors.bar }}>{pct}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{s.flavour}</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  )
}

export default function ParentDashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate                           = useNavigate()
  const location                           = useLocation()

  const [profileData, setProfileData]   = useState(null)
  const [stats, setStats]               = useState([])
  const [discoveries, setDiscoveries]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [activeTab, setActiveTab]       = useState('performance')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()
  }, [user, location.key])

  const loadAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const [profileRes, statsRes, discRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('flavour_stats').select('*').eq('user_id', user.id).order('attempts', { ascending: false }),
        supabase.from('discoveries')
          .select('id, object_name, topic, flavour, flavour_category, score, total_questions, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      setProfileData(profileRes.data  || null)
      setStats(statsRes.data          || [])
      setDiscoveries(discRes.data     || [])
      await refreshProfile()
    } catch (err) {
      console.error('loadAll error:', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  const totalAttempts  = stats.reduce((s, r) => s + (r.attempts        || 0), 0)
  const totalCorrect   = stats.reduce((s, r) => s + (r.total_score     || 0), 0)
  const totalQuestions = stats.reduce((s, r) => s + (r.total_questions || 0), 0)
  const overallPct     = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
  const displayTotal   = totalAttempts > 0 ? totalAttempts : (profileData?.total_quizzes || 0)

  // Group by category
  const grouped = {}
  stats.forEach(s => {
    const cat = s.flavour_category || 'Core'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  // Interest data
  const flavourCount = {}
  discoveries.forEach(d => {
    const f = d.flavour || 'General Knowledge'
    flavourCount[f] = (flavourCount[f] || 0) + 1
  })
  const interestSorted    = Object.entries(flavourCount).sort((a, b) => b[1] - a[1])
  const discoveredObjects = [...new Set(discoveries.map(d => d.object_name).filter(Boolean))]

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
            {profileData?.child_name || 'Your child'}'s learning report
          </p>
        </div>
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs text-violet-600 font-semibold bg-violet-50 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-all disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          Refresh
        </button>
      </div>

      {/* Overview stat cards */}
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
          <p className="text-2xl font-bold text-amber-700">{profileData?.streak_count || 0}🔥</p>
          <p className="text-xs text-amber-600 font-medium">Day streak</p>
        </div>
      </div>

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
              ${activeTab === tab.key ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PERFORMANCE TAB ── */}
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
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-violet-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {totalCorrect} correct out of {totalQuestions} total questions
                </p>
              </div>

              {/* Per category cards with charts */}
              {Object.entries(grouped).map(([category, rows]) => {
                const colors     = CATEGORY_COLORS[category] || CATEGORY_COLORS['Core']
                const catCorrect = rows.reduce((s, r) => s + (r.total_score    || 0), 0)
                const catQs      = rows.reduce((s, r) => s + (r.total_questions|| 0), 0)
                const catPct     = catQs > 0 ? Math.round((catCorrect / catQs) * 100) : 0
                const catAttempts= rows.reduce((s, r) => s + (r.attempts       || 0), 0)

                return (
                  <div key={category} className="bg-white border border-gray-100 rounded-3xl p-5 mb-5">

                    {/* Category header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CATEGORY_ICONS[category] || '📚'}</span>
                        <div>
                          <p className="font-bold text-gray-800 text-base">{category}</p>
                          <p className="text-xs text-gray-400">{catAttempts} quizzes attempted</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
                        {catPct}% avg
                      </div>
                    </div>

                    {/* Radar / donut chart */}
                    <div className="mb-5">
                      <CategoryRadarCard
                        category={category}
                        rows={rows}
                        colors={{ bar: colors.bar, barLight: colors.barLight }}
                      />
                    </div>

                    {/* Horizontal bars per flavour */}
                    <div className="border-t border-gray-50 pt-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                        Flavour breakdown
                      </p>
                      {rows.map(s => {
                        const pct = s.total_questions > 0
                          ? Math.round((s.total_score / s.total_questions) * 100)
                          : 0
                        return (
                          <FlavourBar
                            key={s.id}
                            flavour={s.flavour}
                            pct={pct}
                            attempts={s.attempts}
                            correct={s.total_score}
                            total={s.total_questions}
                            color={colors.bar}
                            lightColor={colors.barLight}
                          />
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

      {/* ── INTERESTS TAB ── */}
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
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-violet-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
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

      {/* ── HISTORY TAB ── */}
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
                      <p className="font-semibold text-gray-800 text-sm truncate">{d.object_name || 'Unknown'}</p>
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
                      }`}>{pct}%</p>
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
