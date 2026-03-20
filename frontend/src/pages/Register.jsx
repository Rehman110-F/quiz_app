import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({
    email: '', password: '', childName: '', ageGroup: '6-10'
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signUp(form.email, form.password, form.childName, form.ageGroup)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold text-gray-800">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start your learning adventure!</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Child's name
            </label>
            <input
              name="childName"
              value={form.childName}
              onChange={handleChange}
              placeholder="e.g. Ali"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-violet-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Age group
            </label>
            <div className="flex gap-3">
              {['4-6', '6-10', '10-14'].map(age => (
                <button
                  type="button"
                  key={age}
                  onClick={() => setForm(prev => ({ ...prev, ageGroup: age }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                    ${form.ageGroup === age
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-600 border-gray-200'
                    }`}
                >
                  {age} yrs
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-violet-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="min 6 characters"
              minLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-violet-400 text-sm"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all"
          >
            {loading ? 'Creating account...' : 'Create Account 🎉'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
