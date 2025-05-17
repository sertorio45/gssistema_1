// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/examples/deploy_node_npm

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Essa função é executada quando um usuário faz login, para adicionar claims personalizados ao JWT
serve(async (req) => {
  // Essa função é acionada pelo hook de login 
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Extrair evento do webhook
    const { type, record } = await req.json()

    // Verificar se é um evento de login
    if (type !== 'AUTH_ON_JWT_TOKEN_GENERATED' || !record?.id) {
      return new Response(JSON.stringify({ message: 'Evento não suportado' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const userId = record.id
    
    // Buscar informações adicionais do usuário, incluindo tenant_id e role
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, role, tenant_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError)
      return new Response(JSON.stringify({ message: 'Erro ao buscar informações do usuário' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Adicionar claims personalizados
    const customClaims = {
      role: user.role || 'cliente',
      tenant_id: user.tenant_id
    }

    // Atualizar app_metadata com role e tenant_id
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { app_metadata: customClaims }
    )
    
    if (updateError) {
      console.error('Erro ao atualizar app_metadata:', updateError)
      return new Response(JSON.stringify({ message: 'Erro ao atualizar app_metadata' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ 
      message: 'Claims personalizados adicionados com sucesso',
      app_metadata: customClaims
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } 
  catch (error) {
    console.error('Erro na função JWT claims:', error)
    return new Response(JSON.stringify({ message: 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}) 