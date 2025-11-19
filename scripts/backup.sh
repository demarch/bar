#!/bin/bash

###############################################################################
# Script de Backup Automatizado do PostgreSQL
# Sistema de Gestão de Bar
#
# Funcionalidades:
# - Backup completo com pg_dump
# - Compressão com gzip
# - Rotação automática (mantém últimos 30 dias)
# - Opcional: Upload para S3 ou storage externo
###############################################################################

set -e

# ============================================================================
# CONFIGURAÇÕES
# ============================================================================

# Carregar variáveis de ambiente
if [ -f .env ]; then
    source .env
fi

# Configurações padrão
BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-bar-postgres-prod}"
POSTGRES_DB="${POSTGRES_DB:-bar_system}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# FUNÇÕES
# ============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# VALIDAÇÕES
# ============================================================================

# Criar diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Criando diretório de backup: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Verificar se container está rodando
if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    log_error "Container PostgreSQL '$POSTGRES_CONTAINER' não está rodando!"
    exit 1
fi

# ============================================================================
# BACKUP
# ============================================================================

log_info "=========================================="
log_info "Iniciando backup do banco de dados"
log_info "=========================================="
log_info "Data/Hora: $(date)"
log_info "Banco: $POSTGRES_DB"
log_info "Container: $POSTGRES_CONTAINER"
log_info "Arquivo: $BACKUP_FILE_GZ"
log_info ""

# Executar pg_dump
log_info "Executando pg_dump..."
docker exec -t "$POSTGRES_CONTAINER" pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    > "$BACKUP_DIR/$BACKUP_FILE" 2>&1

if [ $? -ne 0 ]; then
    log_error "Erro ao executar pg_dump!"
    rm -f "$BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

log_info "✅ Dump criado com sucesso!"

# Compactar backup
log_info "Compactando backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -ne 0 ]; then
    log_error "Erro ao compactar backup!"
    exit 1
fi

log_info "✅ Backup compactado com sucesso!"

# Verificar tamanho do backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE_GZ" | cut -f1)
log_info "Tamanho do backup: $BACKUP_SIZE"

# ============================================================================
# ROTAÇÃO DE BACKUPS
# ============================================================================

log_info ""
log_info "Removendo backups antigos (> $RETENTION_DAYS dias)..."

# Encontrar e remover arquivos antigos
DELETED_COUNT=0
while IFS= read -r old_backup; do
    if [ -n "$old_backup" ]; then
        log_warn "Removendo: $(basename "$old_backup")"
        rm -f "$old_backup"
        ((DELETED_COUNT++))
    fi
done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS)

if [ $DELETED_COUNT -gt 0 ]; then
    log_info "✅ $DELETED_COUNT backup(s) antigo(s) removido(s)"
else
    log_info "Nenhum backup antigo para remover"
fi

# ============================================================================
# UPLOAD PARA STORAGE EXTERNO (OPCIONAL)
# ============================================================================

# Descomentar e configurar se quiser fazer upload para S3 ou outro storage

# if [ -n "$S3_BUCKET" ]; then
#     log_info ""
#     log_info "Fazendo upload para S3..."
#     aws s3 cp "$BACKUP_DIR/$BACKUP_FILE_GZ" "s3://$S3_BUCKET/backups/"
#
#     if [ $? -eq 0 ]; then
#         log_info "✅ Upload para S3 concluído!"
#     else
#         log_error "Erro ao fazer upload para S3"
#     fi
# fi

# ============================================================================
# RESUMO
# ============================================================================

log_info ""
log_info "=========================================="
log_info "Backup concluído com sucesso!"
log_info "=========================================="
log_info "Arquivo: $BACKUP_DIR/$BACKUP_FILE_GZ"
log_info "Tamanho: $BACKUP_SIZE"
log_info "Total de backups: $(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)"
log_info ""

# Listar últimos 10 backups
log_info "Últimos backups disponíveis:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz | tail -10 | awk '{print "  " $9 " (" $5 ")"}'

exit 0
