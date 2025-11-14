#!/bin/bash

# Script para aplicar migração de comissão fixa via API
# Requer que o backend esteja rodando

echo "🔧 Aplicando migração de comissão fixa..."
echo ""

# URL da API (ajuste se necessário)
API_URL="${API_URL:-http://localhost:3001}"

# Fazer login como admin
echo "🔐 Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "senha": "admin123"}')

# Extrair token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login. Verifique as credenciais."
  echo "Resposta: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso"
echo ""

# Aplicar migração
echo "📝 Aplicando migração..."
MIGRATION_RESPONSE=$(curl -s -X POST "${API_URL}/api/migrations/apply-commission-fix" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

# Verificar resposta
if echo "$MIGRATION_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Migração aplicada com sucesso!"
  echo ""
  echo "📊 Resultado:"
  echo "$MIGRATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MIGRATION_RESPONSE"
else
  echo "❌ Erro ao aplicar migração:"
  echo "$MIGRATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MIGRATION_RESPONSE"
  exit 1
fi

echo ""
echo "✨ Processo concluído!"
