import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL missing in .env')
if (!process.env.SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY missing in .env')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default supabase