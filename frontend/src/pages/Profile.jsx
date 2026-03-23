import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

function FeedbackModal({ onClose, userId }) {
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (rating === 0) return
    setLoading(true)
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: userId,
        rating,
        message: message.trim() || null
      })
      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error('Feedback error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center pb-14"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[calc(100vh-3.5rem)] overflow-y-auto">

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Thank you!</h3>
            <p className="text-gray-500 text-sm mb-6">
              Your feedback helps us make SnapQuiz better for every child.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Handle bar */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>

            <h3 className="text-lg font-bold text-gray-800 mb-1">Share your feedback 💬</h3>
            <p className="text-sm text-gray-400 mb-5">
              How is your experience with SnapQuiz?
            </p>

            {/* Star rating */}
            <div className="flex justify-center gap-3 mb-5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="text-4xl transition-transform hover:scale-110 active:scale-95"
                >
                  {star <= (hovered || rating) ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            {/* Rating label */}
            <p className="text-center text-sm font-semibold text-violet-600 mb-4 h-5">
              {rating === 1 && 'Needs a lot of improvement'}
              {rating === 2 && 'Could be better'}
              {rating === 3 && 'It\'s okay'}
              {rating === 4 && 'Really enjoying it!'}
              {rating === 5 && 'Absolutely love it! 🚀'}
            </p>

            {/* Message */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us more... (optional)"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-violet-400 text-sm text-gray-800 resize-none mb-2"
            />
            <p className="text-xs text-gray-400 text-right mb-4">{message.length}/500</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || loading}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all"
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [discoveries, setDiscoveries]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [showFeedback, setShowFeedback] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchData()
    refreshProfile()
  }, [user])

  async function fetchData() {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
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
            className="w-full sm:w-auto text-sm font-bold px-4 py-2.5 rounded-2xl transition-all
              bg-violet-50 text-violet-700 border border-violet-200
              hover:bg-violet-100 active:bg-violet-200 active:text-violet-900 active:border-violet-300
              active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
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
      </div>

      {/* Parent Dashboard button */}
      <button
        onClick={() => navigate('/parent-dashboard')}
        className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl mb-3 transition-all"
      >
        📊 View Parent Dashboard
      </button>

      {/* Feedback button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="w-full py-3.5 bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-600 font-bold rounded-2xl mb-6 transition-all flex items-center justify-center gap-2"
      >
        💬 Share Feedback
      </button>

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

      {/* Feedback modal */}
      {showFeedback && (
        <FeedbackModal
          userId={user.id}
          onClose={() => setShowFeedback(false)}
        />
      )}

    </div>
  )
}
