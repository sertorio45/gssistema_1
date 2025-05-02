
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // 🔐 NUNCA use isso no frontend
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data: articlesCategory, error: articlesCategoryError } = await supabase.from('tenant').select('*')

  if (articlesCategoryError) {
    return { error: articlesCategoryError.message }
  }

  return { articlesCategory }
})
