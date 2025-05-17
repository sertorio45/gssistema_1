#!/bin/bash

# Script para aplicar migrações ao Supabase remoto
# Para usar: ./scripts/apply-migrations.sh

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI não encontrado. Instale-o usando: npm install -g supabase"
    exit 1
fi

# Verificar se existe um projeto Supabase configurado
if [ ! -d "./supabase" ]; then
    echo "Diretório Supabase não encontrado. Inicialize um projeto Supabase primeiro."
    exit 1
fi

echo "Aplicando migrações ao Supabase..."

# Aplicar as migrações - substitua a URL e o token pelos seus valores
# O ideal é usar variáveis de ambiente para armazenar essas informações
supabase db push --db-url "$SUPABASE_DB_URL" --auth-token "$SUPABASE_AUTH_TOKEN"

if [ $? -eq 0 ]; then
    echo "Migrações aplicadas com sucesso!"
else
    echo "Erro ao aplicar migrações."
    exit 1
fi

echo "Reiniciando funções remotamente..."
supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF" --token "$SUPABASE_AUTH_TOKEN" 

if [ $? -eq 0 ]; then
    echo "Funções Edge reiniciadas com sucesso!"
else
    echo "Erro ao reiniciar funções Edge."
    exit 1
fi

echo "Processo concluído." 