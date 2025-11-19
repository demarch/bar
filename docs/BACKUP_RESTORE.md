# Backup e Restore do PostgreSQL

## Visão Geral

O sistema possui scripts automatizados para backup e restore do banco de dados PostgreSQL.

**Características:**
- ✅ Backup completo com pg_dump
- ✅ Compressão automática com gzip
- ✅ Rotação de backups (mantém últimos 30 dias)
- ✅ Backup de segurança antes do restore
- ✅ Logs detalhados
- 🔜 Upload para S3 (opcional)

## Localização dos Scripts

- **Backup**: `scripts/backup.sh`
- **Restore**: `scripts/restore.sh`
- **Backups salvos**: `backups/` (criado automaticamente)

## Backup Manual

### Executar backup imediatamente

```bash
cd /path/to/bar
./scripts/backup.sh
```

**Output esperado:**
```
[INFO] ==========================================
[INFO] Iniciando backup do banco de dados
[INFO] ==========================================
[INFO] Data/Hora: 2025-11-18 10:30:00
[INFO] Banco: bar_system
[INFO] Container: bar-postgres-prod
[INFO] Arquivo: backup_bar_system_20251118_103000.sql.gz

[INFO] Executando pg_dump...
[INFO] ✅ Dump criado com sucesso!
[INFO] Compactando backup...
[INFO] ✅ Backup compactado com sucesso!
[INFO] Tamanho do backup: 2.5M

[INFO] Removendo backups antigos (> 30 dias)...
[INFO] Nenhum backup antigo para remover

[INFO] ==========================================
[INFO] Backup concluído com sucesso!
[INFO] ==========================================
```

### Configurações do Backup

Você pode personalizar via variáveis de ambiente no `.env`:

```bash
# Diretório de backups
BACKUP_DIR=./backups

# Nome do container PostgreSQL
POSTGRES_CONTAINER=bar-postgres-prod

# Banco de dados
POSTGRES_DB=bar_system
POSTGRES_USER=admin

# Dias de retenção
RETENTION_DAYS=30

# Upload S3 (opcional)
# S3_BUCKET=meu-bucket-backups
```

## Backup Automatizado

### Configurar Cron Job

Para backups automáticos, adicione ao crontab:

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup a cada hora
0 * * * * cd /path/to/bar && ./scripts/backup.sh >> /var/log/backup.log 2>&1

# Ou backup diário às 3h da manhã
0 3 * * * cd /path/to/bar && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Frequências Recomendadas

| Ambiente | Frequência | Retenção |
|----------|-----------|----------|
| **Produção** | A cada hora | 30 dias |
| **Staging** | Diário | 14 dias |
| **Desenvolvimento** | Manual | 7 dias |

### Monitorar Backups

Verificar logs:
```bash
tail -f /var/log/backup.log
```

Verificar últimos backups:
```bash
ls -lh backups/ | tail -10
```

Verificar espaço em disco:
```bash
du -sh backups/
```

## Restore de Backup

### ⚠️ IMPORTANTE - LEIA ANTES DE RESTAURAR

**Restaurar um backup irá:**
1. ❌ **APAGAR** todos os dados atuais do banco
2. ✅ Criar backup de segurança antes (safety_backup_*)
3. ✅ Restaurar dados do backup selecionado

### Listar Backups Disponíveis

```bash
ls -lh backups/backup_*.sql.gz
```

### Restaurar Backup Específico

```bash
cd /path/to/bar
./scripts/restore.sh backups/backup_bar_system_20251118_103000.sql.gz
```

**Output esperado:**
```
[WARN] ==========================================
[WARN] ⚠️  ATENÇÃO - OPERAÇÃO DESTRUTIVA  ⚠️
[WARN] ==========================================
[WARN] Esta operação irá:
[WARN]   1. APAGAR todos os dados atuais do banco
[WARN]   2. Restaurar do backup: backup_bar_system_20251118_103000.sql.gz

Tem certeza que deseja continuar? (digite 'SIM' para confirmar): SIM

[INFO] Criando backup de segurança antes do restore...
[INFO] ✅ Backup de segurança salvo em: backups/safety_backup_20251118_104500.sql.gz

[INFO] ==========================================
[INFO] Iniciando restore do banco de dados
[INFO] ==========================================
[INFO] Descompactando backup...
[INFO] Encerrando conexões ativas...
[INFO] Recriando banco de dados...
[INFO] Restaurando dados...
[INFO] ✅ Restore concluído com sucesso!

[INFO] Verificando restore...
[INFO] Tabelas restauradas: 25

[INFO] ==========================================
[INFO] Restore concluído!
[INFO] ==========================================
```

### Após o Restore

**Reinicie o backend para reconectar ao banco:**
```bash
docker-compose -f docker-compose.prod.yml restart backend
```

**Verifique se o sistema está funcionando:**
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Erro: "Container PostgreSQL não está rodando"

**Solução:**
```bash
docker-compose -f docker-compose.prod.yml up -d postgres
```

### Erro: "Permissão negada ao executar script"

**Solução:**
```bash
chmod +x scripts/backup.sh scripts/restore.sh
```

### Backup muito grande

**Solução:** Comprimir ainda mais ou limpar dados antigos:

```sql
-- Conectar ao banco
docker exec -it bar-postgres-prod psql -U admin -d bar_system

-- Limpar comandas fechadas há mais de 1 ano
DELETE FROM itens_comanda WHERE comanda_id IN (
    SELECT id FROM comandas WHERE status = 'fechada' AND data_fechamento < NOW() - INTERVAL '1 year'
);
DELETE FROM comandas WHERE status = 'fechada' AND data_fechamento < NOW() - INTERVAL '1 year';

-- Vacuum para liberar espaço
VACUUM FULL;
```

### Espaço em disco insuficiente

**Verificar espaço:**
```bash
df -h
du -sh backups/
```

**Soluções:**
1. Reduzir `RETENTION_DAYS` para manter menos backups
2. Configurar upload para S3 e remover backups locais antigos
3. Aumentar espaço em disco

### Restore falhou

O script cria um backup de segurança antes do restore. Se algo der errado:

```bash
# Restaurar do backup de segurança
./scripts/restore.sh backups/safety_backup_XXXXXXXXX.sql.gz
```

## Upload para S3 (Opcional)

### Configurar AWS CLI

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciais
aws configure
```

### Ativar Upload no Script

Edite `scripts/backup.sh` e descomente:

```bash
if [ -n "$S3_BUCKET" ]; then
    log_info "Fazendo upload para S3..."
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE_GZ" "s3://$S3_BUCKET/backups/"

    if [ $? -eq 0 ]; then
        log_info "✅ Upload para S3 concluído!"
    else
        log_error "Erro ao fazer upload para S3"
    fi
fi
```

Adicione ao `.env`:
```bash
S3_BUCKET=meu-bucket-backups
```

### Baixar Backup do S3

```bash
aws s3 cp s3://meu-bucket-backups/backups/backup_bar_system_20251118.sql.gz ./backups/
```

## Monitoramento e Alertas

### Script de Monitoramento

Criar `scripts/check-backups.sh`:

```bash
#!/bin/bash

BACKUP_DIR="./backups"
MAX_AGE_HOURS=2  # Alerta se último backup tem mais de 2 horas

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ALERTA: Nenhum backup encontrado!"
    exit 1
fi

BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))
BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))

if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "⚠️ ALERTA: Último backup tem $BACKUP_AGE_HOURS horas!"
    exit 1
fi

echo "✅ Backup OK (idade: $BACKUP_AGE_HOURS horas)"
```

### Integrar com Sistema de Alertas

Adicione ao crontab para verificação a cada 30 minutos:
```bash
*/30 * * * * /path/to/bar/scripts/check-backups.sh || echo "Backup ALERTA!" | mail -s "BACKUP ALERT" admin@dominio.com
```

## Referências

- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [AWS S3 CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3.html)
