#!/bin/bash

###############################################################################
# Script de Renovação Automática de Certificados SSL
# Sistema de Gestão de Bar
#
# Adicione ao crontab para renovação automática:
# 0 0 * * * /path/to/bar/scripts/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1
###############################################################################

set -e

echo "🔄 Renovando certificados SSL..."
echo "Data: $(date)"
echo ""

# Tentar renovar certificados
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot renew

# Verificar se houve renovação
if [ $? -eq 0 ]; then
    echo "✅ Certificados verificados/renovados com sucesso!"

    # Recarregar nginx se houver renovação
    echo "🔄 Recarregando configuração do nginx..."
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

    echo "✅ Nginx recarregado!"
else
    echo "❌ Erro ao renovar certificados"
    exit 1
fi

echo ""
echo "Próxima verificação: $(date -d '+60 days')"
