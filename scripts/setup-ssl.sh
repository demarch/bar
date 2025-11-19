#!/bin/bash

###############################################################################
# Script de Configuração SSL/TLS com Let's Encrypt
# Sistema de Gestão de Bar
###############################################################################

set -e

echo "🔐 Configurando SSL/TLS com Let's Encrypt"
echo "=========================================="
echo ""

# Verificar se o domínio foi fornecido
if [ -z "$1" ]; then
    echo "❌ Erro: Forneça o domínio como argumento"
    echo "Uso: ./setup-ssl.sh seu-dominio.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-admin@$DOMAIN}

echo "📋 Configurações:"
echo "   Domínio: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Verificar se o nginx está rodando
if ! docker ps | grep -q bar-nginx-prod; then
    echo "❌ Erro: Container nginx não está rodando"
    echo "Execute primeiro: docker-compose -f docker-compose.prod.yml up -d nginx"
    exit 1
fi

echo "⏳ Obtendo certificado SSL do Let's Encrypt..."
echo ""

# Criar diretórios se não existirem
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Obter certificado
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificado SSL obtido com sucesso!"
    echo ""
    echo "📝 Próximos passos:"
    echo "   1. Edite nginx/nginx.conf e descomente a seção HTTPS"
    echo "   2. Substitua 'your-domain.com' por '$DOMAIN'"
    echo "   3. Descomente os volumes de certbot no docker-compose.prod.yml"
    echo "   4. Reinicie o nginx: docker-compose -f docker-compose.prod.yml restart nginx"
    echo ""
    echo "🔄 Configure renovação automática com o comando:"
    echo "   ./scripts/renew-ssl.sh"
    echo ""
else
    echo ""
    echo "❌ Erro ao obter certificado SSL"
    echo "Verifique se:"
    echo "   - O domínio $DOMAIN está apontando para este servidor"
    echo "   - As portas 80 e 443 estão abertas no firewall"
    echo "   - O nginx está acessível publicamente"
    exit 1
fi
