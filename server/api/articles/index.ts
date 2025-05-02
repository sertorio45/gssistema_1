import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data: articles, error: articlesError } = await supabase
    .from('article')
    .select('*')

  if (articlesError) {
    throw createError({
      statusCode: 500,
      message: articlesError.message,
    })
  }

  return { articles }
})
