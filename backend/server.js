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
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images statically
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Routes
app.use('/api/quiz', quizRouter)
app.use('/api/text', textRouter)
app.use('/api/auth', authRouter)
app.use('/api/discoveries', discoveriesRouter)
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', time: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
