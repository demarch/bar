# Configuração SSL/TLS com Let's Encrypt

Este guia mostra como configurar SSL/TLS no sistema usando Let's Encrypt (certificados gratuitos).

## Pré-requisitos

1. **Domínio configurado**: Você precisa ter um domínio apontando para o IP do servidor
2. **Portas abertas**: Portas 80 e 443 devem estar abertas no firewall
3. **Docker rodando**: Sistema deve estar rodando com docker-compose

## Passos para Configuração

### 1. Atualizar Configuração do Nginx para Suportar Let's Encrypt

Primeiro, certifique-se de que o nginx está configurado para responder ao desafio do Let's Encrypt.

No arquivo `nginx/nginx.conf`, adicione dentro do bloco `server` na porta 80:

```nginx
# Desafio Let's Encrypt
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

### 2. Executar Script de Configuração SSL

```bash
cd /path/to/bar
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh seu-dominio.com seu-email@dominio.com
```

Substitua:
- `seu-dominio.com` pelo seu domínio real
- `seu-email@dominio.com` pelo seu email (usado para notificações do Let's Encrypt)

### 3. Ativar HTTPS no Nginx

Após obter o certificado, edite `nginx/nginx.conf` e:

1. Descomente o bloco `server` da porta 443
2. Substitua `your-domain.com` pelo seu domínio real
3. Descomente a linha de redirecionamento HTTP → HTTPS no bloco da porta 80

### 4. Ativar Volumes do Certbot

No arquivo `docker-compose.prod.yml`, no serviço nginx, descomente:

```yaml
volumes:
  - ./certbot/conf:/etc/letsencrypt:ro
  - ./certbot/www:/var/www/certbot:ro
```

### 5. Reiniciar Nginx

```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

### 6. Verificar Configuração

Acesse seu site via HTTPS: `https://seu-dominio.com`

Teste a configuração SSL: https://www.ssllabs.com/ssltest/

## Renovação Automática

Certificados Let's Encrypt expiram a cada 90 dias. Configure renovação automática:

### Método 1: Cron Job (Recomendado)

```bash
# Editar crontab
crontab -e

# Adicionar linha para verificar renovação diariamente às 2h da manhã
0 2 * * * cd /path/to/bar && ./scripts/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1
```

### Método 2: Docker Compose com Certbot

Adicione ao `docker-compose.prod.yml`:

```yaml
certbot:
  image: certbot/certbot
  container_name: bar-certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
  networks:
    - bar-network
```

## Configuração Avançada de SSL

### Melhorar Score de Segurança

No `nginx.conf`, ajuste as configurações SSL:

```nginx
# Usar apenas TLS 1.2 e 1.3
ssl_protocols TLSv1.2 TLSv1.3;

# Cifras fortes
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Session cache
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### Habilitar HTTP/2

Já está configurado na linha:
```nginx
listen 443 ssl http2;
```

## Troubleshooting

### Erro: "Failed authorization procedure"

**Causa**: Domínio não está apontando para o servidor ou portas bloqueadas.

**Solução**:
1. Verifique DNS: `dig seu-dominio.com`
2. Verifique se porta 80 está acessível: `curl http://seu-dominio.com`
3. Verifique firewall: `sudo ufw status`

### Erro: "Certificate has expired"

**Causa**: Renovação automática não está funcionando.

**Solução**:
```bash
# Renovar manualmente
./scripts/renew-ssl.sh

# Verificar logs de renovação
tail -f /var/log/ssl-renew.log
```

### Erro: "Too many certificates already issued"

**Causa**: Let's Encrypt tem limite de 5 certificados por semana por domínio.

**Solução**: Aguarde uma semana ou use subdomínio diferente para testes.

## Ambiente de Desenvolvimento

Para desenvolvimento local, você pode:

1. **Usar HTTP** (sem SSL) - adequado para testes locais
2. **Usar certificados auto-assinados** (navegador mostrará aviso)
3. **Usar mkcert** para certificados locais confiáveis

### Opção 3: mkcert (Recomendado para Dev)

```bash
# Instalar mkcert
brew install mkcert  # macOS
# ou
sudo apt install mkcert  # Linux

# Instalar CA local
mkcert -install

# Gerar certificado para localhost
mkcert localhost 127.0.0.1 ::1

# Copiar certificados para nginx
cp localhost+2.pem nginx/localhost.crt
cp localhost+2-key.pem nginx/localhost.key

# Atualizar nginx.conf para usar esses certificados
```

## Referências

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
