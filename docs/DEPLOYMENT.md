# Guia de Deployment - Sistema de Gestao para Bar

## Visao Geral

Este guia cobre a instalacao, configuracao e deploy do sistema em diferentes ambientes.

---

## Indice

1. [Requisitos](#1-requisitos)
2. [Instalacao Rapida](#2-instalacao-rapida)
3. [Configuracao de Ambiente](#3-configuracao-de-ambiente)
4. [Deploy com Docker](#4-deploy-com-docker)
5. [Deploy em Producao](#5-deploy-em-producao)
6. [Configuracao SSL/TLS](#6-configuracao-ssltls)
7. [Monitoramento](#7-monitoramento)
8. [Manutencao](#8-manutencao)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Requisitos

### Hardware Minimo

| Componente | Minimo | Recomendado |
|------------|--------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB SSD | 50 GB SSD |

### Software

| Software | Versao Minima |
|----------|---------------|
| Docker | 20.10+ |
| Docker Compose | 2.0+ |
| Node.js (dev local) | 20+ |
| npm (dev local) | 10+ |

### Portas Necessarias

| Porta | Servico |
|-------|---------|
| 80 | HTTP (Nginx) |
| 443 | HTTPS (Nginx) |
| 3000 | Frontend (dev) |
| 3001 | Backend API |
| 5432 | PostgreSQL |
| 6379 | Redis |

---

## 2. Instalacao Rapida

### Passo 1: Clonar Repositorio

```bash
git clone <repository-url>
cd bar
```

### Passo 2: Configurar Variaveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Gerar secrets seguros
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
```

### Passo 3: Iniciar Containers

```bash
docker-compose up -d
```

### Passo 4: Verificar Status

```bash
docker-compose ps
docker-compose logs -f
```

### Passo 5: Acessar Sistema

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Login**: admin / admin123

---

## 3. Configuracao de Ambiente

### Variaveis do Backend (.env)

```env
# ===========================================
# SERVIDOR
# ===========================================
NODE_ENV=production          # production | development
PORT=3001                    # Porta do servidor

# ===========================================
# BANCO DE DADOS
# ===========================================
DATABASE_URL=postgresql://admin:SENHA_SEGURA@postgres:5432/bar_system

# Configuracoes do Pool
DB_POOL_MAX=20              # Maximo de conexoes
DB_POOL_IDLE_TIMEOUT=30000  # Timeout conexao ociosa (ms)

# ===========================================
# REDIS
# ===========================================
REDIS_URL=redis://redis:6379

# ===========================================
# JWT / AUTENTICACAO
# ===========================================
JWT_SECRET=sua_chave_secreta_32_caracteres_minimo
JWT_REFRESH_SECRET=outra_chave_secreta_32_caracteres
JWT_EXPIRES_IN=1h           # Expiracao do token
JWT_REFRESH_EXPIRES_IN=7d   # Expiracao do refresh token

# ===========================================
# CORS
# ===========================================
CORS_ORIGIN=https://seudominio.com.br

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_WINDOW=60000     # Janela em ms (1 min)
RATE_LIMIT_MAX=100          # Max requisicoes por janela

# ===========================================
# LOGS
# ===========================================
LOG_LEVEL=info              # error | warn | info | debug
LOG_FILE_MAX_SIZE=10485760  # 10MB
LOG_FILE_MAX_FILES=5

# ===========================================
# CONFIGURACOES DO NEGOCIO
# ===========================================
NOME_ESTABELECIMENTO=Meu Bar
PERCENTUAL_COMISSAO_PADRAO=40
TOTAL_QUARTOS=10
TEMPO_MAXIMO_QUARTO_HORAS=4
```

### Variaveis do Frontend (.env)

```env
VITE_API_URL=https://api.seudominio.com.br
VITE_WS_URL=wss://api.seudominio.com.br
```

### Gerando Secrets Seguros

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

---

## 4. Deploy com Docker

### Docker Compose - Desenvolvimento

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bar-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bar_system
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d bar_system"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bar-network

  redis:
    image: redis:7-alpine
    container_name: bar-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bar-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: bar-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - PORT=3001
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD}@postgres:5432/bar_system
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - bar-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: bar-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
      - VITE_WS_URL=${VITE_WS_URL:-ws://localhost:3001}
    depends_on:
      - backend
    networks:
      - bar-network

volumes:
  postgres_data:
  redis_data:

networks:
  bar-network:
    driver: bridge
```

### Comandos Docker Uteis

```bash
# Iniciar todos os servicos
docker-compose up -d

# Ver logs
docker-compose logs -f
docker-compose logs -f backend

# Reiniciar servico
docker-compose restart backend

# Parar tudo
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Rebuild
docker-compose build --no-cache
docker-compose up -d

# Entrar no container
docker-compose exec backend sh
docker-compose exec postgres psql -U admin bar_system

# Ver status
docker-compose ps
```

---

## 5. Deploy em Producao

### Docker Compose - Producao

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: bar-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend
    networks:
      - bar-network

  postgres:
    image: postgres:15-alpine
    container_name: bar-postgres
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bar_system
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d bar_system"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - bar-network
    deploy:
      resources:
        limits:
          memory: 1G

  redis:
    image: redis:7-alpine
    container_name: bar-redis
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - bar-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: bar-backend
    restart: always
    expose:
      - "3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://admin:${POSTGRES_PASSWORD}@postgres:5432/bar_system
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - bar-network
    deploy:
      resources:
        limits:
          memory: 512M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=${VITE_API_URL}
        - VITE_WS_URL=${VITE_WS_URL}
    container_name: bar-frontend
    restart: always
    expose:
      - "80"
    networks:
      - bar-network

volumes:
  postgres_data:
  redis_data:

networks:
  bar-network:
    driver: bridge
```

### Script de Deploy

```bash
#!/bin/bash
# deploy.sh

set -e

echo "=== Iniciando Deploy ==="

# Atualizar codigo
echo "Atualizando repositorio..."
git pull origin main

# Backup do banco
echo "Criando backup..."
docker-compose exec -T postgres pg_dump -U admin bar_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Build das imagens
echo "Building images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Parar servicos
echo "Parando servicos..."
docker-compose -f docker-compose.prod.yml down

# Iniciar servicos
echo "Iniciando servicos..."
docker-compose -f docker-compose.prod.yml up -d

# Aguardar health checks
echo "Aguardando servicos..."
sleep 30

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Aplicar migracoes (se houver)
echo "Aplicando migracoes..."
docker-compose exec backend npm run migrate

echo "=== Deploy Concluido ==="
```

### PM2 para Backend (Alternativa)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bar-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

## 6. Configuracao SSL/TLS

### Opcao 1: Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br

# Renovacao automatica (cron)
0 0 1 * * certbot renew --quiet
```

### Opcao 2: Certificado Manual

```bash
# Gerar certificado auto-assinado (desenvolvimento)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=MeuBar/CN=localhost"
```

### Configuracao Nginx com SSL

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Upstreams
    upstream backend {
        server backend:3001;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        # Frontend (static files)
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket
        location /socket.io {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            # WebSocket timeouts
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # Health check
        location /health {
            proxy_pass http://backend/health;
        }
    }
}
```

---

## 7. Monitoramento

### Health Check Endpoint

```bash
# Verificar status da API
curl http://localhost:3001/health

# Resposta esperada:
# {"status":"ok","timestamp":"2025-01-15T22:00:00.000Z","uptime":86400}
```

### Script de Monitoramento

```bash
#!/bin/bash
# monitor.sh

API_URL="http://localhost:3001/health"
ALERT_EMAIL="admin@seudominio.com.br"

response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response != "200" ]; then
    echo "ALERTA: API retornou status $response" | mail -s "Bar System - API Down" $ALERT_EMAIL

    # Tentar reiniciar
    docker-compose restart backend
fi
```

### Cron para Monitoramento

```bash
# Executar a cada 5 minutos
*/5 * * * * /path/to/monitor.sh >> /var/log/bar-monitor.log 2>&1
```

### Logs

```bash
# Ver logs do backend
docker-compose logs -f backend

# Ver logs do Nginx
docker-compose exec nginx tail -f /var/log/nginx/access.log
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Ver logs do PostgreSQL
docker-compose logs -f postgres
```

---

## 8. Manutencao

### Backup Automatico

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/bar"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Backup do banco
docker-compose exec -T postgres pg_dump -U admin bar_system | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup dos volumes
docker run --rm -v bar_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data_$DATE.tar.gz /data

# Limpar backups antigos
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup concluido: $DATE"
```

### Cron para Backup

```bash
# Backup diario as 3h
0 3 * * * /path/to/backup.sh >> /var/log/bar-backup.log 2>&1
```

### Restore de Backup

```bash
# Restaurar banco
gunzip -c backup_20250115.sql.gz | docker-compose exec -T postgres psql -U admin bar_system

# Restaurar volume
docker run --rm -v bar_postgres_data:/data -v /backups:/backup alpine tar xzf /backup/postgres_data_20250115.tar.gz -C /
```

### Atualizacao do Sistema

```bash
# 1. Fazer backup
./backup.sh

# 2. Parar servicos
docker-compose down

# 3. Atualizar codigo
git pull origin main

# 4. Rebuild
docker-compose build --no-cache

# 5. Iniciar
docker-compose up -d

# 6. Aplicar migracoes
docker-compose exec backend npm run migrate

# 7. Verificar
docker-compose ps
curl http://localhost:3001/health
```

### Limpeza de Docker

```bash
# Remover imagens nao utilizadas
docker image prune -a

# Remover volumes nao utilizados
docker volume prune

# Limpeza completa (CUIDADO)
docker system prune -a
```

---

## 9. Troubleshooting

### Problema: Container nao inicia

```bash
# Verificar logs
docker-compose logs backend

# Verificar status
docker-compose ps

# Verificar health checks
docker inspect bar-postgres | grep Health -A 10
```

### Problema: Banco de dados nao conecta

```bash
# Verificar se PostgreSQL esta rodando
docker-compose exec postgres pg_isready -U admin

# Verificar conexao
docker-compose exec backend sh -c "nc -zv postgres 5432"

# Verificar variaveis de ambiente
docker-compose exec backend env | grep DATABASE
```

### Problema: WebSocket nao conecta

```bash
# Verificar se backend esta escutando
docker-compose exec backend netstat -tlnp | grep 3001

# Verificar configuracao do Nginx
docker-compose exec nginx nginx -t

# Verificar logs de conexao
docker-compose logs -f backend | grep socket
```

### Problema: Permissao negada no volume

```bash
# Corrigir permissoes
sudo chown -R 999:999 /var/lib/docker/volumes/bar_postgres_data

# Ou usar usuario especifico no docker-compose
services:
  postgres:
    user: "999:999"
```

### Problema: Memoria insuficiente

```bash
# Verificar uso de memoria
docker stats

# Limitar memoria no docker-compose
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Problema: Certificado SSL expirado

```bash
# Verificar validade
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# Renovar Let's Encrypt
sudo certbot renew

# Reiniciar Nginx
docker-compose restart nginx
```

### Resetar Sistema (Desenvolvimento)

```bash
# CUIDADO: Apaga todos os dados!
docker-compose down -v
docker-compose up -d
```

---

## Checklist de Deploy

- [ ] Secrets gerados com seguranca
- [ ] Senha admin alterada
- [ ] CORS configurado corretamente
- [ ] SSL/TLS habilitado
- [ ] Backup configurado
- [ ] Monitoramento ativo
- [ ] Logs rotacionados
- [ ] Firewall configurado
- [ ] Health checks funcionando
- [ ] Rate limiting ativo

---

*Documentacao gerada em Novembro 2025*
