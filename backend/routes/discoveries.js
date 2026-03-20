import express from 'express'
import supabase from '../supabase.js'

const router = express.Router()

// Middleware to verify token
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Login required' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  req.user = user
  next()
}

// SAVE a discovery after quiz
router.post('/save', requireAuth, async (req, res) => {
  const { objectName, topic, funFacts, quizData, score, totalQuestions } = req.body

  try {
    // Save discovery
    const { data, error } = await supabase
      .from('discoveries')
      .insert({
        user_id: req.user.id,
        object_name: objectName,
        topic,
        fun_facts: funFacts,
        quiz_data: quizData,
        score,
        total_questions: totalQuestions
      })
      .select()
      .single()

    if (error) throw error

    // Update streak and total quizzes
    const today = new Date().toISOString().split('T')[0]

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_count, last_quiz_date, total_quizzes')
      .eq('id', req.user.id)
      .single()

    let newStreak = profile.streak_count || 0
    const lastDate = profile.last_quiz_date

    // Calculate streak
    if (!lastDate) {
      newStreak = 1
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastDate === yesterdayStr) {
        newStreak += 1  // consecutive day
      } else if (lastDate === today) {
        // already quizzed today, keep streak
      } else {
        newStreak = 1  // streak broken
      }
    }

    await supabase
      .from('profiles')
      .update({
        streak_count: newStreak,
        last_quiz_date: today,
        total_quizzes: (profile.total_quizzes || 0) + 1
      })
      .eq('id', req.user.id)

    res.json({ success: true, discovery: data, streak: newStreak })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all discoveries for a user
router.get('/my', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('discoveries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, discoveries: data })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
