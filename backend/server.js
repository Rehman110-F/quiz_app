import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import quizRouter from './routes/quiz.js'
import authRouter from './routes/auth.js'
import discoveriesRouter from './routes/discoveries.js'
import textRouter from './routes/text.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    /^https:\/\/.*\.vercel\.app$/,
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images statically
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Routes
app.use('/api/quiz',        quizRouter)
app.use('/api/text',        textRouter)
app.use('/api/auth',        authRouter)
app.use('/api/discoveries', discoveriesRouter)

// Health check — must be defined BEFORE the keep-alive interval
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', time: new Date().toISOString() })
})

// Keep Render free tier awake — pings itself every 14 minutes
// Uses RENDER_EXTERNAL_URL which Render sets automatically, or falls back to BACKEND_URL
if (process.env.NODE_ENV === 'production') {
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL
  if (selfUrl) {
    setInterval(() => {
      fetch(`${selfUrl}/api/health`)
        .then(() => console.log('Keep-alive ping sent'))
        .catch(() => {})
    }, 14 * 60 * 1000)
    console.log(`Keep-alive active → ${selfUrl}/api/health`)
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
