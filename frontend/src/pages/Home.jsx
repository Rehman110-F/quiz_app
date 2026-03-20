import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'
import Loader from '../components/Loader'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const LANGUAGES = [
  { code: 'english', label: 'English', flag: '🇬🇧' },
  { code: 'urdu',    label: 'اردو',    flag: '🇵🇰' },
  { code: 'hindi',   label: 'हिंदी',   flag: '🇮🇳' },
]

const FLAVOURS = {
  Core: [
    { name: 'Math and Logic',     emoji: '🔢' },
    { name: 'Science and Nature', emoji: '🔬' },
    { name: 'General Knowledge',  emoji: '🌍' },
  ],
  Cognitive: [
    { name: 'Brain Teasers',       emoji: '🧩' },
    { name: 'Pattern Recognition', emoji: '🔍' },
    { name: 'Critical Thinking',   emoji: '💭' },
  ],
  'Future Skills': [
    { name: 'Financial Literacy',    emoji: '💰' },
    { name: 'Digital Citizenship',   emoji: '💻' },
    { name: 'Emotional Intelligence',emoji: '❤️' },
  ],
}

const INTEREST_OPTIONS = [
  '🦁 Animals', '🚀 Space', '⚽ Sports', '🎮 Games',
  '🍕 Food', '🎨 Art', '🎵 Music', '🌊 Ocean',
  '🦖 Dinosaurs', '🤖 Robots', '🌿 Plants', '🏙️ Cities',
]

const AGE_GROUPS = ['6-10', '10-12', '12-15']

const EXAMPLE_QUERIES = [
  'Lion', 'Volcanoes', 'Solar System', 'Money',
  'Rainforest', 'Robots', 'Ocean', 'Dinosaurs',
]

function BlockedScreen({ reason, suggestion, onRetry }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-amber-200 p-8 text-center">
      <div className="text-6xl mb-4">🛡️</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">
        Oops! Not quite right for this age
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-4">{reason}</p>
      {suggestion && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Try this instead 💡</p>
          <p className="text-amber-800 font-semibold text-sm">{suggestion}</p>
        </div>
      )}
      <button
        onClick={onRetry}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all"
      >
        ← Try Another Topic
      </button>
    </div>
  )
}

export default function Home() {
  const [mode, setMode]           = useState('photo')
  const [image, setImage]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [textQuery, setTextQuery] = useState('')
  const [ageGroup, setAgeGroup]   = useState('6-10')
  const [language, setLanguage]   = useState('english')
  const [flavour, setFlavour]     = useState('General Knowledge')
  const [interests, setInterests] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [step, setStep]           = useState(1)
  const [blocked, setBlocked]     = useState(null)

  const fileRef   = useRef()
  const cameraRef = useRef()
  const navigate  = useNavigate()
  const { user, profile } = useAuth()

  // Load saved language preference from profile
  useEffect(() => {
    if (profile?.language) setLanguage(profile.language)
  }, [profile])

  function handleFile(file) {
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  function toggleInterest(tag) {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  async function handlePhotoSubmit() {
    if (!image) return setError('Please upload or take a photo first.')
    setLoading(true)
    setError(null)
    setBlocked(null)

    const formData = new FormData()
    formData.append('image', image)
    formData.append('ageGroup', ageGroup)
    formData.append('flavour', flavour)
    formData.append('interestTags', JSON.stringify(interests))
    formData.append('language', language)

    try {
      const token = await getToken()
      const res   = await axios.post(`${API_URL}/api/quiz/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      })
      navigate('/quiz', { state: { quizData: res.data.data, imagePreview: preview } })
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTextSubmit() {
    if (!textQuery.trim()) return setError('Please type something first.')
    setLoading(true)
    setError(null)
    setBlocked(null)

    try {
      const token = await getToken()
      const res   = await axios.post(
        `${API_URL}/api/text/generate`,
        { query: textQuery.trim(), ageGroup, flavour, interestTags: interests, language },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      )
      navigate('/quiz', { state: { quizData: res.data.data, imagePreview: null } })
    } catch (err) {
      const data = err.response?.data
      if (data?.error === 'content_not_appropriate') {
        setBlocked({ reason: data.reason, suggestion: data.suggestion })
      } else {
        setError(data?.message || data?.error || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
        <p className="text-gray-500 text-sm font-medium">
          {mode === 'text' ? 'Checking topic and generating quiz...' : 'Analyzing image...'}
        </p>
        <p className="text-gray-400 text-xs">This takes about 5–10 seconds</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Hero */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📸</div>
        <h2 className="text-2xl font-bold text-gray-800">Snap. Ask. Learn!</h2>
        <p className="text-gray-500 text-sm mt-1">
          Take a photo or type any topic to get an instant quiz
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1">
        <button
          onClick={() => { setMode('photo'); setError(null); setBlocked(null) }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
            ${mode === 'photo' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}
        >
          📷 Photo Mode
        </button>
        <button
          onClick={() => { setMode('text'); setError(null); setBlocked(null) }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
            ${mode === 'text' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}
        >
          ✏️ Ask Anything
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 mb-6">
        {['Age & Language', 'Flavour', 'Interests', mode === 'photo' ? 'Photo' : 'Topic'].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <button
              onClick={() => { setStep(i + 1); setBlocked(null) }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all
                ${step === i + 1 ? 'bg-violet-600 text-white'
                  : step > i + 1 ? 'bg-violet-100 text-violet-600'
                  : 'bg-gray-100 text-gray-400'}`}
            >
              <span>{step > i + 1 ? '✓' : i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < 3 && <div className="w-3 h-px bg-gray-200"/>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Age + Language ── */}
      {step === 1 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">

          {/* Age group */}
          <h3 className="text-base font-bold text-gray-800 mb-4">How old is the child? 🎂</h3>
          <div className="flex gap-3 mb-6">
            {AGE_GROUPS.map(age => (
              <button
                key={age}
                onClick={() => setAgeGroup(age)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all
                  ${ageGroup === age
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                  }`}
              >
                {age} yrs
              </button>
            ))}
          </div>

          {/* Language picker */}
          <h3 className="text-base font-bold text-gray-800 mb-4">Quiz language 🌐</h3>
          <div className="flex gap-3 mb-6">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex-1 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1
                  ${language === lang.code
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                  }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-bold">{lang.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Step 2: Flavour ── */}
      {step === 2 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
          <h3 className="text-base font-bold text-gray-800 mb-4">Choose a quiz flavour 🎯</h3>
          {Object.entries(FLAVOURS).map(([category, items]) => (
            <div key={category} className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
              <div className="grid grid-cols-3 gap-2">
                {items.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setFlavour(f.name)}
                    className={`py-3 px-2 rounded-2xl text-center border-2 transition-all
                      ${flavour === f.name
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-violet-300'
                      }`}
                  >
                    <div className="text-xl mb-1">{f.emoji}</div>
                    <div className="text-xs font-semibold leading-tight">{f.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl">← Back</button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-2xl">Next →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Interests ── */}
      {step === 3 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
          <h3 className="text-base font-bold text-gray-800 mb-1">What does the child love? ⭐</h3>
          <p className="text-xs text-gray-400 mb-4">Pick up to 4 — used as analogies in the quiz</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {INTEREST_OPTIONS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleInterest(tag)}
                disabled={!interests.includes(tag) && interests.length >= 4}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                  ${interests.includes(tag)
                    ? 'bg-violet-600 text-white border-violet-600'
                    : interests.length >= 4
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-violet-300'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mb-4">
            {interests.length === 0 ? 'Skip to use general examples' : interests.join(' · ')}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl">← Back</button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-2xl">
              {interests.length === 0 ? 'Skip →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Photo or Text ── */}
      {step === 4 && (
        <div>
          {/* Summary badges */}
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              {ageGroup} yrs
            </span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.label}
            </span>
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              {Object.values(FLAVOURS).flat().find(f => f.name === flavour)?.emoji} {flavour}
            </span>
            {interests.slice(0, 2).map(tag => (
              <span key={tag} className="bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Blocked screen */}
          {blocked ? (
            <BlockedScreen
              reason={blocked.reason}
              suggestion={blocked.suggestion}
              onRetry={() => { setBlocked(null); setTextQuery(''); setError(null) }}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-6">

              {/* ── PHOTO MODE ── */}
              {mode === 'photo' && (
                <>
                  <h3 className="text-base font-bold text-gray-800 mb-4">Take or upload a photo 📷</h3>
                  {preview ? (
                    <div className="relative mb-4">
                      <img src={preview} alt="preview"
                        className="w-full max-h-64 object-contain rounded-2xl border border-gray-100"/>
                      <button
                        onClick={() => { setImage(null); setPreview(null) }}
                        className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-400 hover:text-red-500 text-lg"
                      >✕</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current.click()}
                      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all mb-4"
                    >
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="font-medium text-gray-600 text-sm">Tap to choose a photo</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 5MB</p>
                    </div>
                  )}

                  <input ref={fileRef} type="file" accept="image/*"
                    className="hidden" onChange={e => handleFile(e.target.files[0])} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    className="hidden" onChange={e => handleFile(e.target.files[0])} />

                  {!preview && (
                    <div className="flex gap-3 mb-4">
                      <button onClick={() => fileRef.current.click()}
                        className="flex-1 py-3 bg-white border-2 border-gray-200 hover:border-violet-300 rounded-2xl text-sm font-semibold text-gray-600">
                        🖼️ Gallery
                      </button>
                      <button onClick={() => cameraRef.current.click()}
                        className="flex-1 py-3 bg-violet-100 border-2 border-violet-200 hover:border-violet-400 rounded-2xl text-sm font-semibold text-violet-700">
                        📷 Camera
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl">← Back</button>
                    <button
                      onClick={handlePhotoSubmit}
                      disabled={!image}
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all"
                    >
                      Generate Quiz ✨
                    </button>
                  </div>
                </>
              )}

              {/* ── TEXT MODE ── */}
              {mode === 'text' && (
                <>
                  <h3 className="text-base font-bold text-gray-800 mb-1">Type any topic ✏️</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    We automatically check it's right for your child's age 🛡️
                  </p>
                  <textarea
                    value={textQuery}
                    onChange={e => { setTextQuery(e.target.value); setError(null) }}
                    placeholder="e.g. Lion, Volcanoes, Money, Solar System..."
                    maxLength={200}
                    rows={3}
                    dir={language === 'urdu' ? 'rtl' : 'ltr'}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-violet-400 text-sm text-gray-800 resize-none mb-1"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mb-4">
                    <span className="text-amber-600">🛡️ Age-checked automatically</span>
                    <span>{textQuery.length}/200</span>
                  </div>

                  <p className="text-xs font-semibold text-gray-400 mb-2">Quick examples:</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {EXAMPLE_QUERIES.map(q => (
                      <button
                        key={q}
                        onClick={() => { setTextQuery(q); setError(null) }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${textQuery === q
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300'
                          }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl">← Back</button>
                    <button
                      onClick={handleTextSubmit}
                      disabled={!textQuery.trim()}
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all"
                    >
                      Generate Quiz ✨
                    </button>
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  )
}
