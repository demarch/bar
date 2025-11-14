# Script para aplicar migration no Windows PowerShell
# Execute este arquivo com: .\aplicar-migration.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Aplicando Migration de Pulseiras" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o Docker está rodando
Write-Host "1. Verificando se o Docker está rodando..." -ForegroundColor Yellow
docker-compose ps

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Docker não está rodando ou docker-compose não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Aplicando migration..." -ForegroundColor Yellow

# Aplicar migration
Get-Content backend/database/migrations/apply_all_migrations.sql | docker-compose exec -T postgres psql -U admin -d bar_system

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "Migration aplicada com sucesso!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "3. Verificando instalação..." -ForegroundColor Yellow
    docker-compose exec postgres psql -U admin -d bar_system -c "SELECT * FROM vw_pulseiras_disponiveis LIMIT 5;"

    Write-Host ""
    Write-Host "Sistema de pulseiras instalado e funcionando!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Erro ao aplicar migration" -ForegroundColor Red
    Write-Host "Verifique as mensagens de erro acima" -ForegroundColor Red
}
