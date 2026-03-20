import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import supabase from '../supabase'

function FactCard({ fact, index, isRTL }) {
  const colors = [
    'bg-amber-50 border-amber-200 text-amber-800',
    'bg-teal-50 border-teal-200 text-teal-800',
    'bg-violet-50 border-violet-200 text-violet-800',
  ]
  return (
    <div
      className={`border rounded-2xl px-5 py-4 text-sm font-medium leading-relaxed ${colors[index % colors.length]}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <span className="mr-2">💡</span>{fact}
    </div>
  )
}

function MCQCard({ question, index, onAnswer, isRTL }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function handleSelect(opt) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    onAnswer(opt === question.correctAnswer)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-2">
        Question {index + 1}
      </p>
      <p
        className="text-gray-800 font-medium mb-4 leading-relaxed"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {question.question}
      </p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          let cls = 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300'
          if (revealed) {
            if (opt === question.correctAnswer) cls = 'bg-green-100 border-2 border-green-400 text-green-800'
            else if (opt === selected)          cls = 'bg-red-100 border-2 border-red-400 text-red-800'
            else                                cls = 'bg-gray-50 border border-gray-100 text-gray-400'
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={revealed}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${cls}`}
            >
              <span className="font-bold mr-2 text-gray-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-sm text-gray-600">
            <span className="font-semibold mr-1">
              {selected === question.correctAnswer ? '✅ Correct!' : `❌ Answer: ${question.correctAnswer}`}
            </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

export default function Quiz() {
  const { state }   = useLocation()
  const navigate    = useNavigate()
  const { user }    = useAuth()

  const [answers, setAnswers]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [streak, setStreak]       = useState(null)
  const [saveError, setSaveError] = useState(null)
  const saveCalledRef             = useRef(false)

  if (!state?.quizData) {
    navigate('/')
    return null
  }

  const { quizData, imagePreview } = state
  const flavour         = quizData.flavour         ?? 'General Knowledge'
  const flavourCategory = quizData.flavourCategory ?? 'Core'
  const flavourEmoji    = quizData.flavourEmoji    ?? '📚'
  const interestTags    = quizData.interestTags    ?? []
  const ageGroup        = quizData.ageGroup        ?? '6-10'
  const language        = quizData.language        ?? 'english'
  const isRTL           = language === 'urdu'

  const questions = (quizData.quiz ?? []).filter(
    q => q && q.type === 'mcq' && Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer
  )

  const totalQ       = questions.length
  const answeredQ    = answers.length
  const correctCount = answers.filter(Boolean).length
  const allAnswered  = totalQ > 0 && answeredQ === totalQ
  const scorePct     = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0

  useEffect(() => {
    if (allAnswered && !saveCalledRef.current) {
      saveCalledRef.current = true
      saveResults(answers)
    }
  }, [allAnswered])

  async function saveFlavourStats(score, totalQuestions) {
    const { data: rows, error: selectErr } = await supabase
      .from('flavour_stats')
      .select('id, attempts, total_score, total_questions')
      .eq('user_id', user.id)
      .eq('flavour', flavour)

    if (selectErr) throw new Error('Failed to read flavour stats: ' + selectErr.message)

    if (rows && rows.length > 0) {
      const existing = rows[0]
      const { error: updateErr } = await supabase
        .from('flavour_stats')
        .update({
          attempts:        existing.attempts        + 1,
          total_score:     existing.total_score     + score,
          total_questions: existing.total_questions + totalQuestions,
          last_attempted:  new Date().toISOString(),
          updated_at:      new Date().toISOString()
        })
        .eq('id', existing.id)
      if (updateErr) throw new Error('Failed to update: ' + updateErr.message)
    } else {
      const { error: insertErr } = await supabase
        .from('flavour_stats')
        .insert({
          user_id:          user.id,
          flavour,
          flavour_category: flavourCategory,
          attempts:         1,
          total_score:      score,
          total_questions:  totalQuestions,
          last_attempted:   new Date().toISOString(),
          updated_at:       new Date().toISOString()
        })
      if (insertErr) throw new Error('Failed to insert: ' + insertErr.message)
    }
  }

  async function saveResults(finalAnswers) {
    if (!user) return
    setSaving(true)
    setSaveError(null)

    const score          = finalAnswers.filter(Boolean).length
    const totalQuestions = questions.length

    try {
      const { error: discErr } = await supabase.from('discoveries').insert({
        user_id:          user.id,
        object_name:      quizData.objectName ?? 'Unknown',
        topic:            quizData.topic      ?? flavour,
        fun_facts:        quizData.funFacts   ?? [],
        quiz_data:        questions,
        score,
        total_questions:  totalQuestions,
        flavour,
        flavour_category: flavourCategory,
        interest_tags:    interestTags
      })
      if (discErr) console.error('Discovery error:', discErr.message)

      await saveFlavourStats(score, totalQuestions)

      const today = new Date().toISOString().split('T')[0]
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count, last_quiz_date, total_quizzes')
        .eq('id', user.id)
        .single()

      if (profile) {
        let newStreak  = profile.streak_count ?? 0
        const lastDate = profile.last_quiz_date
        if (!lastDate) {
          newStreak = 1
        } else {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yStr = yesterday.toISOString().split('T')[0]
          if      (lastDate === yStr)  newStreak += 1
          else if (lastDate !== today) newStreak  = 1
        }
        await supabase.from('profiles').update({
          streak_count:   newStreak,
          last_quiz_date: today,
          total_quizzes:  (profile.total_quizzes ?? 0) + 1
        }).eq('id', user.id)
        setStreak(newStreak)
      }

      setSaved(true)
    } catch (err) {
      console.error('saveResults error:', err.message)
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleAnswer(correct) {
    setAnswers(prev => {
      if (prev.length >= totalQ) return prev
      return [...prev, correct]
    })
  }

  if (totalQ === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-gray-600 font-medium mb-1">No valid questions generated.</p>
        <p className="text-gray-400 text-sm mb-6">Please try again with a clearer photo or topic.</p>
        <button onClick={() => navigate('/')}
          className="px-6 py-3 bg-violet-600 text-white font-bold rounded-2xl">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {imagePreview && (
          <img src={imagePreview} alt="object"
            className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm flex-shrink-0"/>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
              {flavourEmoji} {flavour}
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {ageGroup} yrs
            </span>
            {language !== 'english' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {language === 'urdu' ? '🇵🇰 اردو' : '🇮🇳 हिंदी'}
              </span>
            )}
          </div>
          <p className="text-xs text-violet-400 uppercase tracking-wide font-semibold" dir={isRTL ? 'rtl' : 'ltr'}>
            {quizData.topic}
          </p>
          <h2 className="text-xl font-bold text-gray-800 truncate" dir={isRTL ? 'rtl' : 'ltr'}>
            {quizData.objectName}
          </h2>
        </div>
      </div>

      {/* Interest tags */}
      {interestTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5 items-center">
          <span className="text-xs text-gray-400">Analogies:</span>
          {interestTags.map(tag => (
            <span key={tag} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
          ))}
        </div>
      )}

      {/* Fun facts */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Fun Facts 🌟</h3>
        <div className="flex flex-col gap-3">
          {(quizData.funFacts ?? []).map((fact, i) => (
            <FactCard key={i} fact={fact} index={i} isRTL={isRTL} />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{answeredQ} of {totalQ} answered</span>
          {answeredQ > 0 && (
            <span className="font-semibold text-violet-600">
              {correctCount} correct · {Math.round((correctCount / answeredQ) * 100)}% so far
            </span>
          )}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-violet-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(answeredQ / totalQ) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
          Quiz Time 🧠 — {totalQ} Questions
        </h3>
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <MCQCard key={i} question={q} index={i} onAnswer={handleAnswer} isRTL={isRTL} />
          ))}
        </div>
      </div>

      {/* Score card */}
      {allAnswered && (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-3xl p-6 text-center mb-5">
          <div className="text-5xl mb-3">
            {scorePct === 100 ? '🏆' : scorePct >= 70 ? '⭐' : '💪'}
          </div>
          <p className="text-4xl font-bold text-violet-700 mb-1">{correctCount} / {totalQ}</p>
          <p className="text-xl font-semibold text-violet-500 mb-3">{scorePct}% accuracy</p>
          <div className="inline-flex items-center gap-1 bg-white border border-violet-200 rounded-full px-3 py-1 text-sm font-semibold text-violet-600 mb-3">
            {flavourEmoji} {flavour}
          </div>
          <p className="text-gray-500 text-sm">
            {scorePct === 100 ? 'Perfect score! Incredible! 🎉'
              : scorePct >= 70 ? 'Great job! Keep exploring!'
              : 'Good try! Practice makes perfect!'}
          </p>
          {streak !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm">
              🔥 {streak} day streak!
            </div>
          )}
          <div className="mt-4 text-xs">
            {saving    && <p className="text-gray-400 animate-pulse">💾 Saving results...</p>}
            {saved     && <p className="text-green-600 font-medium">✓ Results saved to parent dashboard</p>}
            {saveError && <p className="text-red-500">⚠ {saveError}</p>}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all"
        >
          📸 Snap Another Object
        </button>
        {allAnswered && (
          <button
            onClick={() => navigate('/parent-dashboard')}
            className="w-full py-3 bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-600 font-bold rounded-2xl transition-all"
          >
            📊 View Parent Dashboard
          </button>
        )}
      </div>

    </div>
  )
}
