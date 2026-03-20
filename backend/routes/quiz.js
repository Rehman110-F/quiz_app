import express from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import supabase from '../supabase.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FREE_LIMIT = 10

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

const FLAVOURS = {
  'Math and Logic':        { category: 'Core',          emoji: '🔢' },
  'Science and Nature':    { category: 'Core',          emoji: '🔬' },
  'General Knowledge':     { category: 'Core',          emoji: '🌍' },
  'Brain Teasers':         { category: 'Cognitive',     emoji: '🧩' },
  'Pattern Recognition':   { category: 'Cognitive',     emoji: '🔍' },
  'Critical Thinking':     { category: 'Cognitive',     emoji: '💭' },
  'Financial Literacy':    { category: 'Future Skills', emoji: '💰' },
  'Digital Citizenship':   { category: 'Future Skills', emoji: '💻' },
  'Emotional Intelligence':{ category: 'Future Skills', emoji: '❤️' },
}

const FLAVOUR_INSTRUCTIONS = {
  'Math and Logic':        'Focus on mathematical concepts, counting, patterns, shapes, and logical reasoning.',
  'Science and Nature':    'Focus on scientific facts, biology, physics, chemistry, or natural phenomena.',
  'General Knowledge':     'Focus on interesting world facts, history, geography, or culture.',
  'Brain Teasers':         'Create puzzles and brain-teasing questions that require lateral thinking.',
  'Pattern Recognition':   'Focus on patterns, sequences, similarities, differences, and visual reasoning.',
  'Critical Thinking':     'Ask questions that require reasoning, evaluation, and drawing conclusions.',
  'Financial Literacy':    'Connect to value, cost, saving, spending, needs vs wants.',
  'Digital Citizenship':   'Connect to technology, internet safety, online behaviour, privacy.',
  'Emotional Intelligence':'Focus on emotions, empathy, social situations, and feelings.',
}

const AGE_INSTRUCTIONS = {
  '6-10':  'Use very simple words. Short sentences. Make it playful and fun.',
  '10-12': 'Use moderate vocabulary. Introduce subject-specific terms with simple explanations.',
  '12-15': 'Use subject-appropriate vocabulary. Ask analytical questions.',
}

// Language instructions passed to Gemini
const LANGUAGE_INSTRUCTIONS = {
  english: 'Respond entirely in English.',
  urdu:    'Respond entirely in Urdu language using Urdu script. Every single word including objectName, topic, funFacts, questions, options, correctAnswer and explanation must be written in Urdu (اردو). Do not use any English words.',
  hindi:   'Respond entirely in Hindi language using Devanagari script. Every single word including objectName, topic, funFacts, questions, options, correctAnswer and explanation must be written in Hindi (हिंदी). Do not use any English words.',
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files allowed'))
  }
})

async function getUser(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) return null
    return user || null
  } catch { return null }
}

function buildPrompt(ageGroup, flavour, flavourCategory, interestTags, questionCount, language) {
  const interests = interestTags?.length
    ? `The child loves: ${interestTags.join(', ')}. Use these as analogies where possible.`
    : ''

  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english

  return `
You are an educational AI for children aged ${ageGroup}.

MOST IMPORTANT INSTRUCTION: ${langInstruction}

Quiz flavour: ${flavour} (${flavourCategory})
Focus: ${FLAVOUR_INSTRUCTIONS[flavour] || ''}
Age guidance: ${AGE_INSTRUCTIONS[ageGroup] || AGE_INSTRUCTIONS['6-10']}
${interests}

Analyze the image and respond ONLY with valid JSON. No markdown, no code blocks, no extra text.
Generate EXACTLY ${questionCount} multiple choice questions.

{
  "objectName": "main object in the image — in the specified language",
  "topic": "subject area matching the ${flavour} flavour — in the specified language",
  "funFacts": [
    "fun fact 1 — in the specified language",
    "fun fact 2 — in the specified language",
    "fun fact 3 — in the specified language"
  ],
  "quiz": [
    {
      "type": "mcq",
      "question": "question text — in the specified language",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "explanation — in the specified language"
    }
  ]
}

RULES:
- The quiz array must have EXACTLY ${questionCount} items, all type mcq
- correctAnswer must exactly match one of the 4 options
- ALL text in the JSON must be in the language specified above
- If language is Urdu, write all text in اردو script
- If language is Hindi, write all text in हिंदी script
`
}

async function saveFlavourStats(userId, flavour, flavourCategory, score, totalQuestions) {
  try {
    const { data: rows, error: selectErr } = await supabase
      .from('flavour_stats')
      .select('id, attempts, total_score, total_questions')
      .eq('user_id', userId)
      .eq('flavour', flavour)

    if (selectErr) throw new Error(selectErr.message)

    if (rows && rows.length > 0) {
      const existing = rows[0]
      await supabase
        .from('flavour_stats')
        .update({
          attempts:        existing.attempts + 1,
          total_score:     existing.total_score + score,
          total_questions: existing.total_questions + totalQuestions,
          last_attempted:  new Date().toISOString(),
          updated_at:      new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('flavour_stats')
        .insert({
          user_id:          userId,
          flavour,
          flavour_category: flavourCategory,
          attempts:         1,
          total_score:      score,
          total_questions:  totalQuestions,
          last_attempted:   new Date().toISOString(),
          updated_at:       new Date().toISOString()
        })
    }
  } catch (err) {
    console.error('saveFlavourStats error:', err.message)
  }
}

// POST /api/quiz/generate
router.post('/generate', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })

  const ageGroup        = req.body.ageGroup  || '6-10'
  const flavour         = req.body.flavour   || 'General Knowledge'
  const flavourCategory = FLAVOURS[flavour]?.category || 'Core'
  const interestTags    = req.body.interestTags ? JSON.parse(req.body.interestTags) : []
  const language        = req.body.language  || 'english'
  const questionCount   = Math.floor(Math.random() * 6) + 5
  const filePath        = req.file.path

  try {
    const user = await getUser(req)
    if (user) {
      const today = new Date().toISOString().split('T')[0]
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_scans, last_scan_date')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.last_scan_date !== today) {
          await supabase.from('profiles')
            .update({ daily_scans: 0, last_scan_date: today })
            .eq('id', user.id)
          profile.daily_scans = 0
        }
        if (profile.daily_scans >= FREE_LIMIT) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
          return res.status(429).json({
            error: 'daily_limit_reached',
            message: `You have used all ${FREE_LIMIT} free scans today! Come back tomorrow 🌟`
          })
        }
        await supabase.from('profiles')
          .update({ daily_scans: profile.daily_scans + 1 })
          .eq('id', user.id)
      }
    }

    const model      = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })
    const jpegBuffer = await sharp(filePath).jpeg({ quality: 85 }).toBuffer()
    const imagePart  = { inlineData: { data: jpegBuffer.toString('base64'), mimeType: 'image/jpeg' } }
    const prompt     = buildPrompt(ageGroup, flavour, flavourCategory, interestTags, questionCount, language)

    const result       = await model.generateContent([prompt, imagePart])
    const responseText = result.response.text().trim()
    const cleaned      = responseText
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    const quizData = JSON.parse(cleaned)
    quizData.quiz  = (quizData.quiz || []).filter(
      q => q.type === 'mcq' && Array.isArray(q.options) && q.options.length === 4
    )

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    res.json({
      success: true,
      data: {
        ...quizData,
        flavour,
        flavourCategory,
        flavourEmoji: FLAVOURS[flavour]?.emoji || '📚',
        interestTags,
        ageGroup,
        language
      }
    })

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    console.error('Generate error:', error.message)
    if (error instanceof SyntaxError) return res.status(500).json({ error: 'AI returned invalid format. Please try again.' })
    res.status(500).json({ error: error.message || 'Something went wrong' })
  }
})

// POST /api/quiz/complete
router.post('/complete', async (req, res) => {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Login required' })

  const { flavour, flavourCategory, score, totalQuestions } = req.body
  if (!flavour || !flavourCategory || score == null || !totalQuestions) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  try {
    await saveFlavourStats(user.id, flavour, flavourCategory, score, totalQuestions)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/quiz/flavours
router.get('/flavours', (req, res) => {
  const grouped = {}
  for (const [name, info] of Object.entries(FLAVOURS)) {
    if (!grouped[info.category]) grouped[info.category] = []
    grouped[info.category].push({ name, emoji: info.emoji, category: info.category })
  }
  res.json({ success: true, flavours: grouped })
})

export default router
