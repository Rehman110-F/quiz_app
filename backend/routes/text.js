import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import supabase from '../supabase.js'

const router = express.Router()

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

const AGE_CONTEXT = {
  '6-10':  'a young child aged 6 to 10 years old in primary school',
  '10-12': 'a child aged 10 to 12 years old in middle school',
  '12-15': 'a teenager aged 12 to 15 years old in secondary school',
}

const LANGUAGE_INSTRUCTIONS = {
  english: 'Respond entirely in English.',
  urdu:    'Respond entirely in Urdu language using Urdu script. Every single word including objectName, topic, funFacts, questions, options, correctAnswer and explanation must be written in Urdu (اردو). Do not use any English words.',
  hindi:   'Respond entirely in Hindi language using Devanagari script. Every single word including objectName, topic, funFacts, questions, options, correctAnswer and explanation must be written in Hindi (हिंदी). Do not use any English words.',
}

async function getUser(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) return null
    return user || null
  } catch { return null }
}

async function checkAgeAppropriateness(query, ageGroup) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `
You are a child safety and education expert.
A user typed this query into a children's educational app: "${query}"
The child's age group is: ${ageGroup} years old (${AGE_CONTEXT[ageGroup]})

Evaluate on THREE criteria:
1. SAFETY: Is content safe for children? (not violent, sexual, harmful, drugs/weapons/hate)
2. AGE_APPROPRIATENESS: Is this topic suitable for age ${ageGroup}?
3. EDUCATIONAL_VALUE: Does this have educational value for a child?

Respond ONLY with valid JSON, no extra text:
{
  "safe": true or false,
  "ageAppropriate": true or false,
  "educational": true or false,
  "approved": true or false,
  "reason": "brief kind reason if not approved",
  "suggestion": "a simpler alternative topic if not approved",
  "adjustedTopic": "simplified version if too complex but teachable, otherwise same as query"
}

Rules:
- approved = true ONLY if safe AND ageAppropriate AND educational are all true
- Be FAIR — do not over-block. Animals, planets, volcanoes, money, science are all fine
- reason and suggestion should be warm and encouraging
`
  const result  = await model.generateContent(prompt)
  const text    = result.response.text().trim()
  const cleaned = text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
  return JSON.parse(cleaned)
}

// POST /api/text/generate
router.post('/generate', async (req, res) => {
  const {
    query,
    ageGroup     = '6-10',
    flavour      = 'General Knowledge',
    interestTags = [],
    language     = 'english'
  } = req.body

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' })
  }
  if (query.trim().length > 200) {
    return res.status(400).json({ error: 'Query too long. Keep it under 200 characters.' })
  }

  const flavourCategory = FLAVOURS[flavour]?.category || 'Core'
  const questionCount   = Math.floor(Math.random() * 6) + 5
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english

  try {
    // Daily limit check
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
        if (profile.daily_scans >= 10) {
          return res.status(429).json({
            error: 'daily_limit_reached',
            message: 'You have used all 10 free queries today! Come back tomorrow 🌟'
          })
        }
        await supabase.from('profiles')
          .update({ daily_scans: profile.daily_scans + 1 })
          .eq('id', user.id)
      }
    }

    // Age appropriateness check
    console.log(`Checking: "${query}" for age ${ageGroup}`)
    let check
    try {
      check = await checkAgeAppropriateness(query.trim(), ageGroup)
      console.log('Check result:', JSON.stringify(check))
    } catch (checkErr) {
      console.error('Age check failed:', checkErr.message)
      check = { approved: true, adjustedTopic: query.trim() }
    }

    if (!check.approved) {
      return res.status(422).json({
        error:          'content_not_appropriate',
        blocked:        true,
        reason:         check.reason     || 'This topic is not suitable for this age group.',
        suggestion:     check.suggestion || 'Try searching for something like animals, space, or science!',
        safe:           check.safe,
        ageAppropriate: check.ageAppropriate,
      })
    }

    const finalQuery = check.adjustedTopic || query.trim()

    // Generate quiz
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })
    const interests = interestTags?.length
      ? `The child loves: ${interestTags.join(', ')}. Use these as analogies where possible.`
      : ''

    const prompt = `
You are an educational AI for children aged ${ageGroup}.

MOST IMPORTANT INSTRUCTION: ${langInstruction}

Topic: "${finalQuery}"
Quiz flavour: ${flavour} (${flavourCategory})
Focus: ${FLAVOUR_INSTRUCTIONS[flavour] || ''}
Age guidance: ${AGE_INSTRUCTIONS[ageGroup] || AGE_INSTRUCTIONS['6-10']}
${interests}

Generate an educational quiz about this topic.
Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.
Generate EXACTLY ${questionCount} multiple choice questions.

{
  "objectName": "the topic name — in the specified language",
  "topic": "specific subject area matching the ${flavour} flavour — in the specified language",
  "funFacts": [
    "fun fact 1 about the topic — in the specified language",
    "fun fact 2 about the topic — in the specified language",
    "fun fact 3 about the topic — in the specified language"
  ],
  "quiz": [
    {
      "type": "mcq",
      "question": "question — in the specified language",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "explanation — in the specified language"
    }
  ]
}

RULES:
- quiz array must have EXACTLY ${questionCount} items, all type mcq
- correctAnswer must exactly match one of the 4 options
- ALL text in the JSON must be in the language specified above
- If language is Urdu, write all text in اردو script
- If language is Hindi, write all text in हिंदी script
`

    const result       = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    const cleaned      = responseText
      .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()

    const quizData = JSON.parse(cleaned)
    quizData.quiz  = (quizData.quiz || []).filter(
      q => q.type === 'mcq' && Array.isArray(q.options) && q.options.length === 4
    )

    res.json({
      success: true,
      data: {
        ...quizData,
        flavour,
        flavourCategory,
        flavourEmoji:  FLAVOURS[flavour]?.emoji || '📚',
        interestTags,
        ageGroup,
        language,
        queryMode:     true,
        originalQuery: query.trim(),
        adjustedQuery: finalQuery !== query.trim() ? finalQuery : null,
      }
    })

  } catch (error) {
    console.error('Text generate error:', error.message)
    if (error instanceof SyntaxError) return res.status(500).json({ error: 'AI returned invalid format. Please try again.' })
    res.status(500).json({ error: error.message || 'Something went wrong' })
  }
})

export default router
