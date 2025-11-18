#!/bin/bash

###############################################################################
# Script de Restore do Backup do PostgreSQL
# Sistema de Gestão de Bar
###############################################################################

set -e

# Carregar variáveis de ambiente
if [ -f .env ]; then
    source .env
fi

# Configurações
BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-bar-postgres-prod}"
POSTGRES_DB="${POSTGRES_DB:-bar_system}"
POSTGRES_USER="${POSTGRES_USER:-admin}"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# VALIDAÇÕES
# ============================================================================

if [ -z "$1" ]; then
    log_error "Uso: $0 <arquivo-de-backup.sql.gz>"
    log_info ""
    log_info "Backups disponíveis:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz | tail -10 | awk '{print "  " $9}'
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    log_error "Container PostgreSQL '$POSTGRES_CONTAINER' não está rodando!"
    exit 1
fi

# ============================================================================
# CONFIRMAÇÃO
# ============================================================================

log_warn "=========================================="
log_warn "⚠️  ATENÇÃO - OPERAÇÃO DESTRUTIVA  ⚠️"
log_warn "=========================================="
log_warn "Esta operação irá:"
log_warn "  1. APAGAR todos os dados atuais do banco"
log_warn "  2. Restaurar do backup: $(basename $BACKUP_FILE)"
log_warn ""
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " confirm

if [ "$confirm" != "SIM" ]; then
    log_info "Operação cancelada pelo usuário"
    exit 0
fi

# ============================================================================
# BACKUP DE SEGURANÇA
# ============================================================================

log_info ""
log_info "Criando backup de segurança antes do restore..."
SAFETY_BACKUP="$BACKUP_DIR/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

docker exec -t "$POSTGRES_CONTAINER" pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "$SAFETY_BACKUP"

log_info "✅ Backup de segurança salvo em: $SAFETY_BACKUP"

# ============================================================================
# RESTORE
# ============================================================================

log_info ""
log_info "=========================================="
log_info "Iniciando restore do banco de dados"
log_info "=========================================="

# Descompactar se necessário
TEMP_SQL="/tmp/restore_temp_$$.sql"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Descompactando backup..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
else
    cp "$BACKUP_FILE" "$TEMP_SQL"
fi

# Dropar conexões ativas
log_info "Encerrando conexões ativas..."
docker exec -t "$POSTGRES_CONTAINER" psql \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

# Dropar e recriar banco
log_info "Recriando banco de dados..."
docker exec -t "$POSTGRES_CONTAINER" psql \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" \
    > /dev/null 2>&1

docker exec -t "$POSTGRES_CONTAINER" psql \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "CREATE DATABASE $POSTGRES_DB;" \
    > /dev/null 2>&1

# Restaurar dados
log_info "Restaurando dados..."
docker exec -i "$POSTGRES_CONTAINER" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    < "$TEMP_SQL" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_info "✅ Restore concluído com sucesso!"
else
    log_error "Erro ao restaurar banco de dados!"
    log_warn "Você pode restaurar do backup de segurança: $SAFETY_BACKUP"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Limpar arquivo temporário
rm -f "$TEMP_SQL"

# ============================================================================
# VERIFICAÇÃO
# ============================================================================

log_info ""
log_info "Verificando restore..."

# Contar tabelas
TABLE_COUNT=$(docker exec -t "$POSTGRES_CONTAINER" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
    | tr -d ' \r\n')

log_info "Tabelas restauradas: $TABLE_COUNT"

# ============================================================================
# RESUMO
# ============================================================================

log_info ""
log_info "=========================================="
log_info "Restore concluído!"
log_info "=========================================="
log_info "Backup restaurado de: $(basename $BACKUP_FILE)"
log_info "Backup de segurança: $SAFETY_BACKUP"
log_info ""
log_warn "Recomenda-se reiniciar o backend após o restore:"
log_warn "  docker-compose -f docker-compose.prod.yml restart backend"

exit 0
