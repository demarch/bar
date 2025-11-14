@echo off
REM Script para aplicar migration no Windows CMD
REM Execute este arquivo com: aplicar-migration.bat

echo ==================================
echo Aplicando Migration de Pulseiras
echo ==================================
echo.

echo 1. Verificando Docker...
docker-compose ps
if errorlevel 1 (
    echo Erro: Docker nao esta rodando
    pause
    exit /b 1
)

echo.
echo 2. Aplicando migration...

REM Aplicar migration usando docker cp
docker cp backend\database\migrations\apply_all_migrations.sql bar-postgres:/tmp/apply_all_migrations.sql
docker exec bar-postgres psql -U admin -d bar_system -f /tmp/apply_all_migrations.sql

if errorlevel 1 (
    echo.
    echo Erro ao aplicar migration
    pause
    exit /b 1
)

echo.
echo ==================================
echo Migration aplicada com sucesso!
echo ==================================
echo.

echo 3. Verificando instalacao...
docker-compose exec postgres psql -U admin -d bar_system -c "SELECT * FROM vw_pulseiras_disponiveis LIMIT 5;"

echo.
echo Sistema de pulseiras instalado e funcionando!
pause
