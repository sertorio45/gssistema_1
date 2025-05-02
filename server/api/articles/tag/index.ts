
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

  const { data: articlesTag, error: articlesTagError } = await supabase.from('article_tags').select('*')

  if (articlesTagError) {
    return { error: articlesTagError.message }
  }

  return { articlesTag }
})
