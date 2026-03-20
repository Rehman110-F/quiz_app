import express from 'express'
import supabase from '../supabase.js'

const router = express.Router()

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password, childName, ageGroup } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) return res.status(400).json({ error: error.message })

    // Update profile with child info
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ child_name: childName, age_group: ageGroup })
        .eq('id', data.user.id)
    }

    res.json({
      success: true,
      message: 'Account created! Please verify your email.',
      user: data.user
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) return res.status(400).json({ error: error.message })

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    res.json({
      success: true,
      token: data.session.access_token,
      user: { ...data.user, profile }
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET PROFILE
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) return res.status(401).json({ error: 'No token provided' })

  try {
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) return res.status(401).json({ error: 'Invalid token' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    res.json({ success: true, profile })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
